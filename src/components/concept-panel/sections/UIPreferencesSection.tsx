'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, PaletteIcon } from '@/components/ui/Icons';
import type { AppConcept } from '@/types/appConcept';
import { EditableField } from '../EditableField';

interface UIPreferencesSectionProps {
  appConcept: AppConcept;
  onUpdate: (path: string, value: unknown) => void;
  readOnly?: boolean;
}

const styleOptions = [
  { value: 'modern', label: 'Modern' },
  { value: 'minimalist', label: 'Minimalist' },
  { value: 'playful', label: 'Playful' },
  { value: 'professional', label: 'Professional' },
  { value: 'custom', label: 'Custom' },
];

const colorSchemeOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'Auto (System)' },
  { value: 'custom', label: 'Custom' },
];

const layoutOptions = [
  { value: 'single-page', label: 'Single Page' },
  { value: 'multi-page', label: 'Multi Page' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'custom', label: 'Custom' },
];

/**
 * Section for UI preferences: style, colors, layout
 */
export function UIPreferencesSection({
  appConcept,
  onUpdate,
  readOnly = false,
}: UIPreferencesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const prefs = appConcept.uiPreferences || {};

  const handleUpdate = (field: string, value: unknown) => {
    onUpdate(`uiPreferences.${field}`, value);
  };

  return (
    <div>
      {/* Header with toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left mb-2"
      >
        {isExpanded ? (
          <ChevronDownIcon size={14} className="text-zinc-400" />
        ) : (
          <ChevronRightIcon size={14} className="text-zinc-400" />
        )}
        <PaletteIcon size={14} className="text-zinc-400" />
        <span className="text-xs text-zinc-500 uppercase tracking-wide">UI Preferences</span>
      </button>

      {isExpanded && (
        <div className="space-y-3 pl-5">
          <EditableField
            label="Style"
            value={prefs.style || 'modern'}
            onChange={(value) => handleUpdate('style', value)}
            type="select"
            options={styleOptions}
            readOnly={readOnly}
          />

          <EditableField
            label="Color Scheme"
            value={prefs.colorScheme || 'auto'}
            onChange={(value) => handleUpdate('colorScheme', value)}
            type="select"
            options={colorSchemeOptions}
            readOnly={readOnly}
          />

          <EditableField
            label="Layout"
            value={prefs.layout || 'single-page'}
            onChange={(value) => handleUpdate('layout', value)}
            type="select"
            options={layoutOptions}
            readOnly={readOnly}
          />

          {/* Color swatches */}
          {(prefs.primaryColor || prefs.secondaryColor || prefs.accentColor) && (
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 uppercase tracking-wide block">Colors</label>
              <div className="flex gap-2">
                {prefs.primaryColor && (
                  <div
                    className="w-6 h-6 rounded border border-zinc-600"
                    style={{ backgroundColor: prefs.primaryColor }}
                    title={`Primary: ${prefs.primaryColor}`}
                  />
                )}
                {prefs.secondaryColor && (
                  <div
                    className="w-6 h-6 rounded border border-zinc-600"
                    style={{ backgroundColor: prefs.secondaryColor }}
                    title={`Secondary: ${prefs.secondaryColor}`}
                  />
                )}
                {prefs.accentColor && (
                  <div
                    className="w-6 h-6 rounded border border-zinc-600"
                    style={{ backgroundColor: prefs.accentColor }}
                    title={`Accent: ${prefs.accentColor}`}
                  />
                )}
              </div>
            </div>
          )}

          {/* Inspiration/reference */}
          {(prefs.inspiration || !readOnly) && (
            <EditableField
              label="Inspiration"
              value={prefs.inspiration || ''}
              onChange={(value) => handleUpdate('inspiration', value)}
              placeholder="URL or description..."
              readOnly={readOnly}
              valueClassName="text-sm"
            />
          )}
        </div>
      )}
    </div>
  );
}

export default UIPreferencesSection;
