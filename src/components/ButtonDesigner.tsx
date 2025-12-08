'use client';

/**
 * ButtonDesigner Component
 *
 * Full button design panel with variant management, size selection,
 * icon support, loading states, and preset library.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { ButtonSpec } from '@/types/layoutDesign';
import {
  BUTTON_PRESETS,
  BUTTON_SIZES,
  PRESET_CATEGORIES,
  getPresetsByCategory,
  applySize,
  type ButtonPreset,
  type ButtonSizePreset,
} from '@/data/buttonPresets';
import { StatePreview, StatePreviewGrid } from './StatePreview';
import type { ComponentState } from '@/hooks/useComponentStates';

// ============================================================================
// TYPES
// ============================================================================

interface ButtonDesignerProps {
  buttons?: ButtonSpec[];
  onChange?: (buttons: ButtonSpec[]) => void;
  className?: string;
}

interface ButtonVariant {
  id: string;
  name: string;
  spec: ButtonSpec;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function PresetCard({
  preset,
  isSelected,
  onSelect,
}: {
  preset: ButtonPreset;
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
        <StatePreview componentType="button" spec={preset.spec} forcedState="default" />
      </div>
      <p className="text-xs text-slate-500 mt-2">{preset.description}</p>
    </button>
  );
}

function SizeSelector({
  currentSize,
  onSelect,
}: {
  currentSize: string;
  onSelect: (size: ButtonSizePreset) => void;
}) {
  return (
    <div className="flex gap-2">
      {BUTTON_SIZES.map((size) => (
        <button
          key={size.id}
          onClick={() => onSelect(size)}
          className={`
            flex-1 py-2 px-3 text-sm rounded-lg border transition-all
            ${
              currentSize === size.id
                ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
            }
          `}
        >
          {size.name}
        </button>
      ))}
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
  variants: ButtonVariant[];
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
          Button Variants
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

function IconSettings({
  hasIcon,
  iconPosition,
  onToggleIcon,
  onPositionChange,
}: {
  hasIcon: boolean;
  iconPosition: 'left' | 'right';
  onToggleIcon: () => void;
  onPositionChange: (position: 'left' | 'right') => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm text-slate-300">Show Icon</label>
        <button
          onClick={onToggleIcon}
          className={`
            w-12 h-6 rounded-full transition-colors relative
            ${hasIcon ? 'bg-blue-600' : 'bg-slate-700'}
          `}
        >
          <span
            className={`
              absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
              ${hasIcon ? 'left-7' : 'left-1'}
            `}
          />
        </button>
      </div>
      {hasIcon && (
        <div className="flex gap-2">
          <button
            onClick={() => onPositionChange('left')}
            className={`
              flex-1 py-2 px-3 text-sm rounded-lg border transition-all flex items-center justify-center gap-2
              ${
                iconPosition === 'left'
                  ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
              }
            `}
          >
            <span>←</span> Left
          </button>
          <button
            onClick={() => onPositionChange('right')}
            className={`
              flex-1 py-2 px-3 text-sm rounded-lg border transition-all flex items-center justify-center gap-2
              ${
                iconPosition === 'right'
                  ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
              }
            `}
          >
            Right <span>→</span>
          </button>
        </div>
      )}
    </div>
  );
}

function LoadingStateSettings({
  hasLoading,
  loadingText,
  onToggle,
  onTextChange,
}: {
  hasLoading: boolean;
  loadingText: string;
  onToggle: () => void;
  onTextChange: (text: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm text-slate-300">Loading State</label>
        <button
          onClick={onToggle}
          className={`
            w-12 h-6 rounded-full transition-colors relative
            ${hasLoading ? 'bg-blue-600' : 'bg-slate-700'}
          `}
        >
          <span
            className={`
              absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
              ${hasLoading ? 'left-7' : 'left-1'}
            `}
          />
        </button>
      </div>
      {hasLoading && (
        <input
          type="text"
          value={loadingText}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Loading text..."
          className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:border-blue-500 focus:outline-none"
        />
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ButtonDesigner({
  buttons: initialButtons,
  onChange,
  className = '',
}: ButtonDesignerProps) {
  // State
  const [variants, setVariants] = useState<ButtonVariant[]>(() => {
    if (initialButtons && initialButtons.length > 0) {
      return initialButtons.map((spec, index) => ({
        id: `variant-${index}`,
        name: spec.variant || `Variant ${index + 1}`,
        spec,
      }));
    }
    return [{ id: 'variant-0', name: 'Primary', spec: BUTTON_PRESETS[0].spec }];
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('solid');
  const [hasIcon, setHasIcon] = useState(false);
  const [iconPosition, setIconPosition] = useState<'left' | 'right'>('left');
  const [hasLoading, setHasLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Loading...');
  const [showAllStates, setShowAllStates] = useState(false);

  // Current variant
  const currentVariant = variants[selectedIndex];
  const currentSpec = currentVariant?.spec;

  // Filtered presets by category
  const filteredPresets = useMemo(
    () => getPresetsByCategory(selectedCategory as ButtonPreset['category']),
    [selectedCategory]
  );

  // Notify parent of changes
  const notifyChange = useCallback(
    (newVariants: ButtonVariant[]) => {
      onChange?.(newVariants.map((v) => v.spec));
    },
    [onChange]
  );

  // Handlers
  const handlePresetSelect = useCallback(
    (preset: ButtonPreset) => {
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

  const handleSizeSelect = useCallback(
    (size: ButtonSizePreset) => {
      const newVariants = [...variants];
      newVariants[selectedIndex] = {
        ...newVariants[selectedIndex],
        spec: applySize(currentSpec, size),
      };
      setVariants(newVariants);
      notifyChange(newVariants);
    },
    [variants, selectedIndex, currentSpec, notifyChange]
  );

  const handleAddVariant = useCallback(() => {
    const newVariant: ButtonVariant = {
      id: `variant-${Date.now()}`,
      name: `Variant ${variants.length + 1}`,
      spec: { ...BUTTON_PRESETS[0].spec },
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

  const availableStates: ComponentState[] = ['default', 'hover', 'focus', 'active', 'disabled'];

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

      {/* Preview Section */}
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
          <StatePreviewGrid componentType="button" spec={currentSpec} states={availableStates} />
        ) : (
          <StatePreview componentType="button" spec={currentSpec} />
        )}
      </div>

      {/* Size Selector */}
      <div>
        <label className="block text-xs text-slate-400 mb-2">Size</label>
        <SizeSelector currentSize={currentSpec?.size || 'md'} onSelect={handleSizeSelect} />
      </div>

      {/* Preset Category Tabs */}
      <div>
        <label className="block text-xs text-slate-400 mb-2">Style Presets</label>
        <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg mb-3">
          {PRESET_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`
                flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all
                ${
                  selectedCategory === cat.id
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }
              `}
            >
              <span className="mr-1">{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Preset Grid */}
        <div className="grid grid-cols-2 gap-3">
          {filteredPresets.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              isSelected={currentSpec?.variant === preset.spec.variant}
              onSelect={() => handlePresetSelect(preset)}
            />
          ))}
        </div>
      </div>

      {/* Additional Options */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <IconSettings
            hasIcon={hasIcon}
            iconPosition={iconPosition}
            onToggleIcon={() => setHasIcon(!hasIcon)}
            onPositionChange={setIconPosition}
          />
        </div>
        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <LoadingStateSettings
            hasLoading={hasLoading}
            loadingText={loadingText}
            onToggle={() => setHasLoading(!hasLoading)}
            onTextChange={setLoadingText}
          />
        </div>
      </div>

      {/* Export Info */}
      <div className="text-xs text-slate-500 p-3 bg-slate-800/30 rounded-lg">
        <strong className="text-slate-400">Tip:</strong> Double-click variant names to rename them.
        Changes are automatically saved to your design system.
      </div>
    </div>
  );
}

export default ButtonDesigner;
