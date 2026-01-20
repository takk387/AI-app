'use client';

/**
 * LinkDesigner Component
 *
 * Design panel for link styling with variants and hover effects.
 * NOTE: Presets removed - link styles are AI-generated based on design description.
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

// No hardcoded defaults - link styles are AI-generated based on design description

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

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
        value={value.startsWith('#') ? value : '#888888'}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border border-slate-600"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-2 py-1 text-sm bg-slate-800 border border-slate-600 rounded text-slate-200 focus:border-garden-500 focus:outline-none"
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
          className="text-xs px-2 py-1 rounded bg-garden-600 text-white hover:bg-garden-500 transition-colors"
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
                  ? 'border-garden-500 bg-garden-500/20 text-garden-300'
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
  // State - initialize from props only, no hardcoded defaults
  const [variants, setVariants] = useState<LinkVariant[]>(() => {
    if (initialLinks && initialLinks.length > 0) {
      return initialLinks.map((spec, index) => ({
        id: `variant-${index}`,
        name: spec.variant || `Variant ${index + 1}`,
        spec,
      }));
    }
    // Return empty - prompt user to generate via AI
    return [];
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
    // Create minimal spec - colors will be customized by user or generated by AI
    const minimalSpec: LinkSpec = {
      variant: `variant-${variants.length + 1}`,
      states: {
        default: { color: 'currentColor', textDecoration: 'none', opacity: '1', background: 'transparent' },
        hover: { color: 'currentColor', textDecoration: 'underline', opacity: '1', background: 'transparent' },
        focus: { color: 'currentColor', textDecoration: 'underline', opacity: '1', background: 'transparent' },
        active: { color: 'currentColor', textDecoration: 'underline', opacity: '1', background: 'transparent' },
      },
      fontSize: '14px',
      fontWeight: 500,
      textDecoration: 'none',
      transition: 'all 0.15s ease',
    };
    const newVariant: LinkVariant = {
      id: `variant-${Date.now()}`,
      name: `Variant ${variants.length + 1}`,
      spec: minimalSpec,
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

  // Empty state - no links defined yet
  if (variants.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="p-6 bg-slate-900 rounded-xl border border-slate-700 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-300 mb-2">No Link Styles Defined</h3>
          <p className="text-sm text-slate-400 mb-4">
            Link styles will be generated by AI based on your design description.
          </p>
          <button
            onClick={handleAddVariant}
            className="px-4 py-2 bg-garden-600 text-white rounded-lg hover:bg-garden-500 transition-colors"
          >
            + Add Custom Variant
          </button>
        </div>
      </div>
    );
  }

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

      {/* AI-Generated Styles Note */}
      <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 text-center">
        <p className="text-sm text-slate-400">
          Link styles are generated by AI based on your design description.
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Use the color customization below to fine-tune the generated styles.
        </p>
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
                value={currentSpec?.states[state as keyof LinkSpec['states']]?.color || 'currentColor'}
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
        Customize colors for each state as needed.
      </div>
    </div>
  );
}

export default LinkDesigner;
