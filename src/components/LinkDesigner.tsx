'use client';

/**
 * LinkDesigner Component
 *
 * Design panel for link styling with variants, hover effects, and presets.
 */

import React, { useState, useCallback } from 'react';
import type { LinkSpec, ComponentState } from '@/hooks/useComponentStates';
import { StatePreview, StatePreviewGrid } from './StatePreview';

// ============================================================================
// TYPES
// ============================================================================

interface LinkDesignerProps {
  links?: LinkSpec[];
  onChange?: (links: LinkSpec[]) => void;
  className?: string;
}

interface LinkVariant {
  id: string;
  name: string;
  spec: LinkSpec;
}

// ============================================================================
// PRESETS
// ============================================================================

const LINK_PRESETS: { id: string; name: string; description: string; spec: LinkSpec }[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Standard link with underline on hover',
    spec: {
      variant: 'default',
      states: {
        default: {
          color: '#3B82F6',
          textDecoration: 'none',
          opacity: '1',
          background: 'transparent',
        },
        hover: {
          color: '#60A5FA',
          textDecoration: 'underline',
          opacity: '1',
          background: 'transparent',
        },
        focus: {
          color: '#3B82F6',
          textDecoration: 'underline',
          opacity: '1',
          background: 'rgba(59, 130, 246, 0.1)',
        },
        active: {
          color: '#2563EB',
          textDecoration: 'underline',
          opacity: '1',
          background: 'transparent',
        },
      },
      fontSize: '14px',
      fontWeight: 500,
      textDecoration: 'none',
      transition: 'all 0.15s ease',
    },
  },
  {
    id: 'underlined',
    name: 'Always Underlined',
    description: 'Underlined link that changes color on hover',
    spec: {
      variant: 'underlined',
      states: {
        default: {
          color: '#3B82F6',
          textDecoration: 'underline',
          opacity: '1',
          background: 'transparent',
        },
        hover: {
          color: '#60A5FA',
          textDecoration: 'underline',
          opacity: '1',
          background: 'transparent',
        },
        focus: {
          color: '#3B82F6',
          textDecoration: 'underline',
          opacity: '1',
          background: 'rgba(59, 130, 246, 0.1)',
        },
        active: {
          color: '#2563EB',
          textDecoration: 'underline',
          opacity: '1',
          background: 'transparent',
        },
      },
      fontSize: '14px',
      fontWeight: 500,
      textDecoration: 'underline',
      transition: 'all 0.15s ease',
    },
  },
  {
    id: 'subtle',
    name: 'Subtle',
    description: 'Muted link that becomes prominent on hover',
    spec: {
      variant: 'subtle',
      states: {
        default: {
          color: '#94A3B8',
          textDecoration: 'none',
          opacity: '1',
          background: 'transparent',
        },
        hover: {
          color: '#F8FAFC',
          textDecoration: 'none',
          opacity: '1',
          background: 'transparent',
        },
        focus: {
          color: '#F8FAFC',
          textDecoration: 'none',
          opacity: '1',
          background: 'rgba(148, 163, 184, 0.1)',
        },
        active: {
          color: '#CBD5E1',
          textDecoration: 'none',
          opacity: '1',
          background: 'transparent',
        },
      },
      fontSize: '14px',
      fontWeight: 400,
      textDecoration: 'none',
      transition: 'all 0.15s ease',
    },
  },
  {
    id: 'nav',
    name: 'Navigation',
    description: 'Bold navigation link with background on hover',
    spec: {
      variant: 'nav',
      states: {
        default: {
          color: '#94A3B8',
          textDecoration: 'none',
          opacity: '1',
          background: 'transparent',
        },
        hover: {
          color: '#F8FAFC',
          textDecoration: 'none',
          opacity: '1',
          background: 'rgba(255, 255, 255, 0.1)',
        },
        focus: {
          color: '#F8FAFC',
          textDecoration: 'none',
          opacity: '1',
          background: 'rgba(255, 255, 255, 0.1)',
        },
        active: {
          color: '#3B82F6',
          textDecoration: 'none',
          opacity: '1',
          background: 'rgba(59, 130, 246, 0.1)',
        },
      },
      fontSize: '14px',
      fontWeight: 500,
      textDecoration: 'none',
      transition: 'all 0.2s ease',
    },
  },
  {
    id: 'gradient',
    name: 'Gradient',
    description: 'Link with gradient text effect',
    spec: {
      variant: 'gradient',
      states: {
        default: {
          color: '#8B5CF6',
          textDecoration: 'none',
          opacity: '1',
          background: 'transparent',
        },
        hover: {
          color: '#A78BFA',
          textDecoration: 'none',
          opacity: '1',
          background: 'transparent',
        },
        focus: {
          color: '#8B5CF6',
          textDecoration: 'none',
          opacity: '1',
          background: 'rgba(139, 92, 246, 0.1)',
        },
        active: {
          color: '#7C3AED',
          textDecoration: 'none',
          opacity: '1',
          background: 'transparent',
        },
      },
      fontSize: '14px',
      fontWeight: 600,
      textDecoration: 'none',
      transition: 'all 0.2s ease',
    },
  },
  {
    id: 'danger',
    name: 'Danger',
    description: 'Red link for destructive actions',
    spec: {
      variant: 'danger',
      states: {
        default: {
          color: '#EF4444',
          textDecoration: 'none',
          opacity: '1',
          background: 'transparent',
        },
        hover: {
          color: '#F87171',
          textDecoration: 'underline',
          opacity: '1',
          background: 'transparent',
        },
        focus: {
          color: '#EF4444',
          textDecoration: 'underline',
          opacity: '1',
          background: 'rgba(239, 68, 68, 0.1)',
        },
        active: {
          color: '#DC2626',
          textDecoration: 'underline',
          opacity: '1',
          background: 'transparent',
        },
      },
      fontSize: '14px',
      fontWeight: 500,
      textDecoration: 'none',
      transition: 'all 0.15s ease',
    },
  },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function PresetCard({
  preset,
  isSelected,
  onSelect,
}: {
  preset: (typeof LINK_PRESETS)[0];
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`
        p-3 rounded-lg border transition-all text-left
        ${
          isSelected
            ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
        }
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-200">{preset.name}</span>
        {isSelected && <span className="text-xs text-blue-400">Active</span>}
      </div>
      <div className="flex justify-center py-2">
        <StatePreview componentType="link" spec={preset.spec} forcedState="default" />
      </div>
      <p className="text-xs text-slate-500 mt-2">{preset.description}</p>
    </button>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-slate-500 w-20">{label}</label>
      <input
        type="color"
        value={value.startsWith('#') ? value : '#3B82F6'}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border border-slate-600"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-2 py-1 text-sm bg-slate-800 border border-slate-600 rounded text-slate-200 focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
}

function VariantManager({
  variants,
  selectedIndex,
  onSelect,
  onAdd,
  onRemove,
  onRename,
}: {
  variants: LinkVariant[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onRename: (index: number, name: string) => void;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditName(variants[index].name);
  };

  const finishEditing = () => {
    if (editingIndex !== null && editName.trim()) {
      onRename(editingIndex, editName.trim());
    }
    setEditingIndex(null);
    setEditName('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">
          Link Variants
        </label>
        <button
          onClick={onAdd}
          className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors"
        >
          + Add Variant
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant, index) => (
          <div
            key={variant.id}
            className={`
              group relative flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all cursor-pointer
              ${
                selectedIndex === index
                  ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
              }
            `}
            onClick={() => onSelect(index)}
          >
            {editingIndex === index ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={finishEditing}
                onKeyDown={(e) => e.key === 'Enter' && finishEditing()}
                autoFocus
                className="w-20 bg-transparent text-sm outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <span
                  className="text-sm"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startEditing(index);
                  }}
                >
                  {variant.name}
                </span>
                {variants.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(index);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all ml-1"
                  >
                    ×
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LinkDesigner({ links: initialLinks, onChange, className = '' }: LinkDesignerProps) {
  // State
  const [variants, setVariants] = useState<LinkVariant[]>(() => {
    if (initialLinks && initialLinks.length > 0) {
      return initialLinks.map((spec, index) => ({
        id: `variant-${index}`,
        name: spec.variant || `Variant ${index + 1}`,
        spec,
      }));
    }
    return [{ id: 'variant-0', name: 'Default', spec: LINK_PRESETS[0].spec }];
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showAllStates, setShowAllStates] = useState(false);

  // Current variant
  const currentVariant = variants[selectedIndex];
  const currentSpec = currentVariant?.spec;

  // Notify parent
  const notifyChange = useCallback(
    (newVariants: LinkVariant[]) => {
      onChange?.(newVariants.map((v) => v.spec));
    },
    [onChange]
  );

  // Handlers
  const handlePresetSelect = useCallback(
    (preset: (typeof LINK_PRESETS)[0]) => {
      const newVariants = [...variants];
      newVariants[selectedIndex] = {
        ...newVariants[selectedIndex],
        spec: { ...preset.spec },
      };
      setVariants(newVariants);
      notifyChange(newVariants);
    },
    [variants, selectedIndex, notifyChange]
  );

  const handleColorChange = useCallback(
    (state: keyof LinkSpec['states'], property: string, value: string) => {
      const newVariants = [...variants];
      const newSpec = { ...currentSpec };
      newSpec.states = {
        ...newSpec.states,
        [state]: {
          ...newSpec.states[state],
          [property]: value,
        },
      };
      newVariants[selectedIndex] = { ...newVariants[selectedIndex], spec: newSpec };
      setVariants(newVariants);
      notifyChange(newVariants);
    },
    [variants, selectedIndex, currentSpec, notifyChange]
  );

  const handleAddVariant = useCallback(() => {
    const newVariant: LinkVariant = {
      id: `variant-${Date.now()}`,
      name: `Variant ${variants.length + 1}`,
      spec: { ...LINK_PRESETS[0].spec },
    };
    const newVariants = [...variants, newVariant];
    setVariants(newVariants);
    setSelectedIndex(newVariants.length - 1);
    notifyChange(newVariants);
  }, [variants, notifyChange]);

  const handleRemoveVariant = useCallback(
    (index: number) => {
      if (variants.length <= 1) return;
      const newVariants = variants.filter((_, i) => i !== index);
      setVariants(newVariants);
      if (selectedIndex >= newVariants.length) {
        setSelectedIndex(newVariants.length - 1);
      }
      notifyChange(newVariants);
    },
    [variants, selectedIndex, notifyChange]
  );

  const handleRenameVariant = useCallback(
    (index: number, name: string) => {
      const newVariants = [...variants];
      newVariants[index] = {
        ...newVariants[index],
        name,
        spec: { ...newVariants[index].spec, variant: name.toLowerCase().replace(/\s+/g, '-') },
      };
      setVariants(newVariants);
      notifyChange(newVariants);
    },
    [variants, notifyChange]
  );

  const availableStates: ComponentState[] = ['default', 'hover', 'focus', 'active'];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Variant Manager */}
      <VariantManager
        variants={variants}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        onAdd={handleAddVariant}
        onRemove={handleRemoveVariant}
        onRename={handleRenameVariant}
      />

      {/* Preview */}
      <div className="p-4 bg-slate-900 rounded-xl border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs text-slate-400">Preview</label>
          <button
            onClick={() => setShowAllStates(!showAllStates)}
            className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            {showAllStates ? 'Interactive' : 'Show All States'}
          </button>
        </div>
        {showAllStates ? (
          <StatePreviewGrid componentType="link" spec={currentSpec} states={availableStates} />
        ) : (
          <StatePreview componentType="link" spec={currentSpec} />
        )}
      </div>

      {/* Presets */}
      <div>
        <label className="block text-xs text-slate-400 mb-2">Style Presets</label>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {LINK_PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              isSelected={currentSpec?.variant === preset.spec.variant}
              onSelect={() => handlePresetSelect(preset)}
            />
          ))}
        </div>
      </div>

      {/* Color Customization */}
      <div className="space-y-4">
        <label className="block text-xs text-slate-400 font-medium uppercase tracking-wide">
          Custom Colors
        </label>
        <div className="grid grid-cols-2 gap-4">
          {availableStates.map((state) => (
            <div key={state} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
              <label className="block text-xs text-slate-500 mb-2 uppercase">{state}</label>
              <ColorPicker
                label="Color"
                value={currentSpec?.states[state as keyof LinkSpec['states']]?.color || '#3B82F6'}
                onChange={(value) =>
                  handleColorChange(state as keyof LinkSpec['states'], 'color', value)
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* Typography Settings */}
      <div className="space-y-3">
        <label className="block text-xs text-slate-400 font-medium uppercase tracking-wide">
          Typography
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Font Size</label>
            <select
              value={currentSpec?.fontSize || '14px'}
              onChange={(e) => {
                const newVariants = [...variants];
                newVariants[selectedIndex] = {
                  ...newVariants[selectedIndex],
                  spec: { ...currentSpec, fontSize: e.target.value },
                };
                setVariants(newVariants);
                notifyChange(newVariants);
              }}
              className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-200"
            >
              <option value="12px">12px - Small</option>
              <option value="14px">14px - Default</option>
              <option value="16px">16px - Large</option>
              <option value="18px">18px - X-Large</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Font Weight</label>
            <select
              value={currentSpec?.fontWeight || 500}
              onChange={(e) => {
                const newVariants = [...variants];
                newVariants[selectedIndex] = {
                  ...newVariants[selectedIndex],
                  spec: { ...currentSpec, fontWeight: parseInt(e.target.value) },
                };
                setVariants(newVariants);
                notifyChange(newVariants);
              }}
              className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-200"
            >
              <option value="400">400 - Normal</option>
              <option value="500">500 - Medium</option>
              <option value="600">600 - Semibold</option>
              <option value="700">700 - Bold</option>
            </select>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="text-xs text-slate-500 p-3 bg-slate-800/30 rounded-lg">
        <strong className="text-slate-400">Tip:</strong> Double-click variant names to rename them.
        Use presets as starting points and customize colors as needed.
      </div>
    </div>
  );
}

export default LinkDesigner;
