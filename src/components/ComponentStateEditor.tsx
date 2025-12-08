'use client';

/**
 * ComponentStateEditor Component
 *
 * Visual editor for component states (hover, focus, active, disabled).
 * Supports buttons, inputs, cards, and links with live preview.
 */

import React, { useCallback, useState } from 'react';
import {
  useComponentStates,
  type ComponentType,
  type ComponentState,
  type StateProperty,
  type AnyComponentSpec,
} from '@/hooks/useComponentStates';
import StatePreview from './StatePreview';

// ============================================================================
// TYPES
// ============================================================================

interface ComponentStateEditorProps {
  componentType?: ComponentType;
  initialSpec?: AnyComponentSpec;
  onChange?: (spec: AnyComponentSpec) => void;
  showPreview?: boolean;
  className?: string;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ColorInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value.startsWith('#') ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border border-slate-600"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        className="flex-1 px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-md text-slate-200 focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
}

function PropertyEditor({
  property,
  value,
  onChange,
}: {
  property: StateProperty;
  value: string;
  onChange: (value: string) => void;
}) {
  switch (property.type) {
    case 'color':
      return <ColorInput value={value} onChange={onChange} label={property.label} />;

    case 'number':
      return (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={property.min ?? 0}
            max={property.max ?? 100}
            step={property.max && property.max <= 1 ? 0.1 : 1}
            value={parseFloat(value) || 0}
            onChange={(e) =>
              onChange(property.unit ? `${e.target.value}${property.unit}` : e.target.value)
            }
            className="flex-1 accent-blue-500"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-20 px-2 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-md text-slate-200 focus:border-blue-500 focus:outline-none"
          />
        </div>
      );

    case 'select':
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-md text-slate-200 focus:border-blue-500 focus:outline-none"
        >
          {property.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    default:
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={property.label}
          className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-md text-slate-200 focus:border-blue-500 focus:outline-none"
        />
      );
  }
}

function StateTabs({
  states,
  currentState,
  onSelect,
}: {
  states: ComponentState[];
  currentState: ComponentState;
  onSelect: (state: ComponentState) => void;
}) {
  const stateLabels: Record<ComponentState, { label: string; icon: string }> = {
    default: { label: 'Default', icon: '○' },
    hover: { label: 'Hover', icon: '◉' },
    focus: { label: 'Focus', icon: '◎' },
    active: { label: 'Active', icon: '●' },
    disabled: { label: 'Disabled', icon: '◌' },
    error: { label: 'Error', icon: '⚠' },
  };

  return (
    <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg">
      {states.map((state) => {
        const { label, icon } = stateLabels[state];
        const isActive = currentState === state;

        return (
          <button
            key={state}
            onClick={() => onSelect(state)}
            className={`
              flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all
              ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }
            `}
          >
            <span className="mr-1">{icon}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ComponentTypeTabs({
  currentType,
  onSelect,
}: {
  currentType: ComponentType;
  onSelect: (type: ComponentType) => void;
}) {
  const types: { type: ComponentType; label: string; icon: string }[] = [
    { type: 'button', label: 'Button', icon: '🔘' },
    { type: 'input', label: 'Input', icon: '📝' },
    { type: 'card', label: 'Card', icon: '🃏' },
    { type: 'link', label: 'Link', icon: '🔗' },
  ];

  return (
    <div className="flex gap-2">
      {types.map(({ type, label, icon }) => (
        <button
          key={type}
          onClick={() => onSelect(type)}
          className={`
            px-4 py-2 text-sm font-medium rounded-lg transition-all border
            ${
              currentType === type
                ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
            }
          `}
        >
          <span className="mr-1.5">{icon}</span>
          {label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ComponentStateEditor({
  componentType: initialType = 'button',
  initialSpec,
  onChange,
  showPreview = true,
  className = '',
}: ComponentStateEditorProps) {
  const {
    componentType,
    currentState,
    spec,
    getStateValue,
    setStateValue,
    copyState,
    resetState,
    resetAllStates,
    setComponentType,
    setCurrentState,
    availableProperties,
    availableStates,
  } = useComponentStates(initialType, initialSpec);

  const [previewState, setPreviewState] = useState<ComponentState | 'interactive'>('interactive');

  // Notify parent of changes
  const handlePropertyChange = useCallback(
    (property: string, value: string) => {
      setStateValue(property, value);
      // Delay onChange to batch updates
      setTimeout(() => {
        onChange?.(spec);
      }, 0);
    },
    [setStateValue, onChange, spec]
  );

  // Copy state handler
  const [copySource, setCopySource] = useState<ComponentState | null>(null);

  const handleCopyState = () => {
    if (copySource && copySource !== currentState) {
      copyState(copySource, currentState);
      setCopySource(null);
      onChange?.(spec);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Component Type Selector */}
      <div>
        <label className="block text-xs text-slate-400 mb-2">Component Type</label>
        <ComponentTypeTabs currentType={componentType} onSelect={setComponentType} />
      </div>

      {/* State Tabs */}
      <div>
        <label className="block text-xs text-slate-400 mb-2">State</label>
        <StateTabs
          states={availableStates}
          currentState={currentState}
          onSelect={setCurrentState}
        />
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="p-4 bg-slate-900 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs text-slate-400">Live Preview</label>
            <select
              value={previewState}
              onChange={(e) => setPreviewState(e.target.value as ComponentState | 'interactive')}
              className="text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-300"
            >
              <option value="interactive">Interactive</option>
              {availableStates.map((state) => (
                <option key={state} value={state}>
                  {state.charAt(0).toUpperCase() + state.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <StatePreview
            componentType={componentType}
            spec={spec}
            forcedState={previewState === 'interactive' ? undefined : previewState}
          />
        </div>
      )}

      {/* Property Editors */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            {currentState} State Properties
          </label>
          <div className="flex gap-2">
            {/* Copy from dropdown */}
            <div className="flex items-center gap-1">
              <select
                value={copySource || ''}
                onChange={(e) => setCopySource((e.target.value as ComponentState) || null)}
                className="text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-300"
              >
                <option value="">Copy from...</option>
                {availableStates
                  .filter((s) => s !== currentState)
                  .map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
              </select>
              <button
                onClick={handleCopyState}
                disabled={!copySource}
                className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Copy
              </button>
            </div>

            {/* Reset buttons */}
            <button
              onClick={() => resetState(currentState)}
              className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
            >
              Reset State
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          {availableProperties.map((property) => (
            <div key={property.name} className="space-y-1">
              <label className="text-xs text-slate-500">{property.label}</label>
              <PropertyEditor
                property={property}
                value={getStateValue(property.name)}
                onChange={(value) => handlePropertyChange(property.name, value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Global Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-700">
        <button
          onClick={resetAllStates}
          className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
        >
          Reset All States
        </button>

        <div className="text-xs text-slate-500">
          Editing: {componentType} / {currentState}
        </div>
      </div>
    </div>
  );
}

export default ComponentStateEditor;
