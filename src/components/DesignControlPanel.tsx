'use client';

/**
 * DesignControlPanel Component
 *
 * Real-time control panel for adjusting design settings directly.
 * Provides sliders and toggles for spacing, effects, colors, and component visibility.
 */

import React, { useState, useMemo } from 'react';
import type {
  EffectsSettings,
  ColorSettings,
  TypographySettings,
  SpacingSettings,
  LayoutDesign,
  ButtonSpec,
} from '@/types/layoutDesign';
import { checkContrast } from '@/utils/colorHarmony';
import { TypographyPanel } from './TypographyPanel';
import { SpacingPanel } from './SpacingPanel';
import { AccessibilityPanel } from './AccessibilityPanel';
import { ComponentStateEditor } from './ComponentStateEditor';
// ButtonDesigner removed - presets eliminated, AI generates styles dynamically
import { LinkDesigner } from './LinkDesigner';
import type { LinkSpec } from '@/hooks/useComponentStates';

// ============================================================================
// TYPES
// ============================================================================

interface ComponentVisibility {
  showHeader?: boolean;
  showSidebar?: boolean;
  showHero?: boolean;
  showFooter?: boolean;
  showCards?: boolean;
  showStats?: boolean;
  showList?: boolean;
}

interface DesignControlPanelProps {
  effectsSettings?: Partial<EffectsSettings>;
  colorSettings?: Partial<ColorSettings>;
  onEffectsChange?: (effects: Partial<EffectsSettings>) => void;
  onColorChange?: (colors: Partial<ColorSettings>) => void;
  primaryColor?: string;
  onPrimaryColorChange?: (color: string) => void;
  componentVisibility?: ComponentVisibility;
  onVisibilityChange?: (visibility: ComponentVisibility) => void;
  className?: string;
  // Typography panel props
  typographySettings?: Partial<TypographySettings>;
  onTypographyChange?: (typography: Partial<TypographySettings>) => void;
  // Spacing panel props
  spacingSettings?: Partial<SpacingSettings>;
  onSpacingChange?: (spacing: Partial<SpacingSettings>) => void;
  showGridOverlay?: boolean;
  onGridOverlayToggle?: (show: boolean) => void;
  // Accessibility panel props
  layoutDesign?: LayoutDesign;
  onAccessibilityFix?: (fixes: Partial<ColorSettings>) => void;
  // Component design props
  buttonSpecs?: ButtonSpec[];
  onButtonSpecsChange?: (buttons: ButtonSpec[]) => void;
  linkSpecs?: LinkSpec[];
  onLinkSpecsChange?: (links: LinkSpec[]) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BORDER_RADIUS_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'XL' },
  { value: 'full', label: 'Full' },
] as const;

const SHADOW_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'subtle', label: 'Subtle' },
  { value: 'medium', label: 'Medium' },
  { value: 'strong', label: 'Strong' },
] as const;

const BLUR_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'subtle', label: 'Subtle' },
  { value: 'medium', label: 'Medium' },
  { value: 'strong', label: 'Strong' },
] as const;

const ANIMATION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'subtle', label: 'Subtle' },
  { value: 'smooth', label: 'Smooth' },
  { value: 'playful', label: 'Playful' },
] as const;

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Collapsible section component
 */
function Section({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-700 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between text-xs font-medium text-slate-300 hover:bg-slate-700/50 transition-colors"
      >
        <span>{title}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </div>
  );
}

/**
 * Segmented control for selecting from predefined options
 */
function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
      <div className="flex gap-1 bg-slate-800 p-0.5 rounded-md">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex-1 px-2 py-1 text-xs rounded transition-all ${
              value === option.value
                ? 'bg-garden-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Color picker with label
 */
function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
}) {
  const defaultColor = '#6B7280'; // Neutral gray - actual colors are AI-generated

  return (
    <div className="flex items-center justify-between">
      <label className="text-xs text-slate-400">{label}</label>
      <label className="relative cursor-pointer">
        <span className="sr-only">Choose {label}</span>
        <input
          type="color"
          value={value || defaultColor}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="w-6 h-6 rounded border border-white/20"
          style={{ backgroundColor: value || defaultColor }}
        />
      </label>
    </div>
  );
}

/**
 * Toggle switch
 */
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs text-slate-400">{label}</label>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          checked ? 'bg-garden-600' : 'bg-slate-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </button>
    </div>
  );
}

/**
 * Contrast badge component for WCAG compliance indication
 */
function ContrastBadge({ foreground, background }: { foreground?: string; background?: string }) {
  const result = useMemo(() => {
    if (!foreground || !background) return null;
    try {
      return checkContrast(foreground, background);
    } catch {
      return null;
    }
  }, [foreground, background]);

  if (!result) return null;

  const getBadgeColor = () => {
    if (result.passesAAA) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (result.passesAA) return 'bg-lime-500/20 text-lime-400 border-lime-500/30';
    if (result.passesAALarge) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${getBadgeColor()}`}
      title={`Contrast ratio: ${result.ratio.toFixed(2)}:1 - ${result.level}`}
    >
      {result.ratio.toFixed(1)}:1 {result.level}
    </span>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DesignControlPanel({
  effectsSettings,
  colorSettings,
  onEffectsChange,
  onColorChange,
  primaryColor,
  onPrimaryColorChange,
  componentVisibility,
  onVisibilityChange,
  className = '',
  typographySettings,
  onTypographyChange,
  spacingSettings,
  onSpacingChange,
  showGridOverlay,
  onGridOverlayToggle,
  layoutDesign,
  onAccessibilityFix,
  buttonSpecs,
  onButtonSpecsChange,
  linkSpecs,
  onLinkSpecsChange,
}: DesignControlPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [openSections, setOpenSections] = useState({
    components: false,
    effects: true,
    colors: false,
    typography: false,
    spacing: false,
    accessibility: false,
    componentDesign: false,
  });
  const [componentDesignTab, setComponentDesignTab] = useState<'states' | 'buttons' | 'links'>(
    'buttons'
  );

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleEffectChange = <K extends keyof EffectsSettings>(
    key: K,
    value: EffectsSettings[K]
  ) => {
    onEffectsChange?.({
      ...effectsSettings,
      [key]: value,
    });
  };

  const handleColorSettingChange = <K extends keyof ColorSettings>(
    key: K,
    value: ColorSettings[K]
  ) => {
    onColorChange?.({
      ...colorSettings,
      [key]: value,
    });
  };

  const handleVisibilityChange = <K extends keyof ComponentVisibility>(key: K, value: boolean) => {
    onVisibilityChange?.({
      ...componentVisibility,
      [key]: value,
    });
  };

  // Default visibility (all visible if not specified)
  const visibility: ComponentVisibility = {
    showHeader: componentVisibility?.showHeader ?? true,
    showSidebar: componentVisibility?.showSidebar ?? true,
    showHero: componentVisibility?.showHero ?? true,
    showFooter: componentVisibility?.showFooter ?? true,
    showCards: componentVisibility?.showCards ?? true,
    showStats: componentVisibility?.showStats ?? true,
    showList: componentVisibility?.showList ?? true,
  };

  return (
    <div
      className={`bg-slate-800/95 rounded-lg border border-slate-700 overflow-hidden ${className}`}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between bg-slate-700/50"
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-garden-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
          <span className="text-xs font-medium text-slate-300">Design Controls</span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="max-h-80 overflow-y-auto">
          {/* Components Section */}
          <Section
            title="Component Visibility"
            isOpen={openSections.components}
            onToggle={() => toggleSection('components')}
          >
            <div className="space-y-2">
              <Toggle
                label="Header"
                checked={visibility.showHeader || false}
                onChange={(v) => handleVisibilityChange('showHeader', v)}
              />
              <Toggle
                label="Sidebar"
                checked={visibility.showSidebar || false}
                onChange={(v) => handleVisibilityChange('showSidebar', v)}
              />
              <Toggle
                label="Hero Section"
                checked={visibility.showHero || false}
                onChange={(v) => handleVisibilityChange('showHero', v)}
              />
              <Toggle
                label="Stats"
                checked={visibility.showStats || false}
                onChange={(v) => handleVisibilityChange('showStats', v)}
              />
              <Toggle
                label="Cards"
                checked={visibility.showCards || false}
                onChange={(v) => handleVisibilityChange('showCards', v)}
              />
              <Toggle
                label="List"
                checked={visibility.showList || false}
                onChange={(v) => handleVisibilityChange('showList', v)}
              />
              <Toggle
                label="Footer"
                checked={visibility.showFooter || false}
                onChange={(v) => handleVisibilityChange('showFooter', v)}
              />
            </div>
          </Section>

          {/* Effects Section */}
          <Section
            title="Effects & Layout"
            isOpen={openSections.effects}
            onToggle={() => toggleSection('effects')}
          >
            <SegmentedControl
              label="Border Radius"
              value={effectsSettings?.borderRadius}
              options={BORDER_RADIUS_OPTIONS}
              onChange={(v) => handleEffectChange('borderRadius', v)}
            />

            <SegmentedControl
              label="Shadows"
              value={effectsSettings?.shadows}
              options={SHADOW_OPTIONS}
              onChange={(v) => handleEffectChange('shadows', v)}
            />

            <SegmentedControl
              label="Blur Effects"
              value={effectsSettings?.blur}
              options={BLUR_OPTIONS}
              onChange={(v) => handleEffectChange('blur', v)}
            />

            <SegmentedControl
              label="Animations"
              value={effectsSettings?.animations}
              options={ANIMATION_OPTIONS}
              onChange={(v) => handleEffectChange('animations', v)}
            />

            <Toggle
              label="Enable Gradients"
              checked={effectsSettings?.gradients || false}
              onChange={(v) => handleEffectChange('gradients', v)}
            />
          </Section>

          {/* Colors Section */}
          <Section
            title="Colors"
            isOpen={openSections.colors}
            onToggle={() => toggleSection('colors')}
          >
            {/* Primary color with contrast check against white */}
            <div className="space-y-1">
              <ColorPicker
                label="Primary"
                value={primaryColor || colorSettings?.primary}
                onChange={(v) => {
                  onPrimaryColorChange?.(v);
                  handleColorSettingChange('primary', v);
                }}
              />
              <div className="flex justify-end">
                <ContrastBadge
                  foreground="#FFFFFF"
                  background={primaryColor || colorSettings?.primary}
                />
              </div>
            </div>

            <ColorPicker
              label="Secondary"
              value={colorSettings?.secondary}
              onChange={(v) => handleColorSettingChange('secondary', v)}
            />

            <ColorPicker
              label="Accent"
              value={colorSettings?.accent}
              onChange={(v) => handleColorSettingChange('accent', v)}
            />

            {/* Text and Background Colors with Contrast Check */}
            <div className="border-t border-slate-700 pt-2 mt-2">
              <div className="text-xs text-slate-500 mb-2">Text & Background</div>

              <div className="space-y-1">
                <ColorPicker
                  label="Text"
                  value={colorSettings?.text || '#1F2937'}
                  onChange={(v) => handleColorSettingChange('text', v)}
                />
                <ColorPicker
                  label="Background"
                  value={colorSettings?.background || '#FFFFFF'}
                  onChange={(v) => handleColorSettingChange('background', v)}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Text/BG Contrast:</span>
                  <ContrastBadge
                    foreground={colorSettings?.text || '#1F2937'}
                    background={colorSettings?.background || '#FFFFFF'}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-700 pt-2 mt-2">
              <div className="text-xs text-slate-500 mb-2">Status Colors</div>

              <ColorPicker
                label="Success"
                value={colorSettings?.success || '#6B7280'}
                onChange={(v) => handleColorSettingChange('success', v)}
              />

              <ColorPicker
                label="Warning"
                value={colorSettings?.warning || '#6B7280'}
                onChange={(v) => handleColorSettingChange('warning', v)}
              />

              <ColorPicker
                label="Error"
                value={colorSettings?.error || '#6B7280'}
                onChange={(v) => handleColorSettingChange('error', v)}
              />

              <ColorPicker
                label="Info"
                value={colorSettings?.info || '#6B7280'}
                onChange={(v) => handleColorSettingChange('info', v)}
              />
            </div>
          </Section>

          {/* Typography Section */}
          {onTypographyChange && (
            <Section
              title="Typography"
              isOpen={openSections.typography}
              onToggle={() => toggleSection('typography')}
            >
              <TypographyPanel
                typography={typographySettings || {}}
                onChange={onTypographyChange}
              />
            </Section>
          )}

          {/* Spacing Section */}
          {onSpacingChange && (
            <Section
              title="Spacing"
              isOpen={openSections.spacing}
              onToggle={() => toggleSection('spacing')}
            >
              <SpacingPanel
                spacing={spacingSettings || {}}
                onChange={onSpacingChange}
                showGridOverlay={showGridOverlay}
                onGridOverlayToggle={onGridOverlayToggle}
              />
            </Section>
          )}

          {/* Accessibility Section */}
          {layoutDesign && (
            <Section
              title="Accessibility"
              isOpen={openSections.accessibility}
              onToggle={() => toggleSection('accessibility')}
            >
              <AccessibilityPanel design={layoutDesign} onAutoFix={onAccessibilityFix} />
            </Section>
          )}

          {/* Component Design Section */}
          {(onButtonSpecsChange || onLinkSpecsChange) && (
            <Section
              title="Component Design"
              isOpen={openSections.componentDesign}
              onToggle={() => toggleSection('componentDesign')}
            >
              {/* Tab Selector */}
              <div className="flex gap-1 bg-slate-800 p-0.5 rounded-md mb-3">
                <button
                  type="button"
                  onClick={() => setComponentDesignTab('states')}
                  className={`flex-1 px-2 py-1 text-xs rounded transition-all ${
                    componentDesignTab === 'states'
                      ? 'bg-gold-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  States
                </button>
                <button
                  type="button"
                  onClick={() => setComponentDesignTab('buttons')}
                  className={`flex-1 px-2 py-1 text-xs rounded transition-all ${
                    componentDesignTab === 'buttons'
                      ? 'bg-gold-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Buttons
                </button>
                <button
                  type="button"
                  onClick={() => setComponentDesignTab('links')}
                  className={`flex-1 px-2 py-1 text-xs rounded transition-all ${
                    componentDesignTab === 'links'
                      ? 'bg-gold-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Links
                </button>
              </div>

              {/* Tab Content */}
              <div className="max-h-96 overflow-y-auto">
                {componentDesignTab === 'states' && <ComponentStateEditor showPreview={true} />}
                {componentDesignTab === 'buttons' && (
                  <div className="p-4 text-center text-slate-500 text-sm">
                    Button styles are generated by AI based on your design description.
                  </div>
                )}
                {componentDesignTab === 'links' && onLinkSpecsChange && (
                  <LinkDesigner links={linkSpecs} onChange={onLinkSpecsChange} />
                )}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

export default DesignControlPanel;
