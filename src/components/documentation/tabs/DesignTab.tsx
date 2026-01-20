'use client';

/**
 * DesignTab - Displays layout design snapshot with preview
 */

import React, { useState } from 'react';
import {
  ImageIcon,
  PaletteIcon,
  SparklesIcon,
  RefreshIcon,
  LayoutIcon,
} from '@/components/ui/Icons';
import type { LayoutSnapshot } from '@/types/projectDocumentation';

interface DesignTabProps {
  snapshot: LayoutSnapshot;
  onUpdateScreenshot?: () => void;
}

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function Section({ icon, title, children, defaultExpanded = true }: SectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left mb-2 hover:bg-slate-700/30 rounded p-1 -ml-1 transition-colors"
      >
        <span className="text-slate-400">{icon}</span>
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide flex-1">
          {title}
        </h3>
        <span className="text-slate-600 text-xs">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && children}
    </div>
  );
}

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded border border-slate-700" style={{ backgroundColor: color }} />
      <div>
        <div className="text-xs text-slate-400">{label}</div>
        <div className="text-xs text-slate-600 font-mono">{color}</div>
      </div>
    </div>
  );
}

export function DesignTab({ snapshot, onUpdateScreenshot }: DesignTabProps) {
  const { design } = snapshot;
  const globalStyles = design?.globalStyles;
  const colors = globalStyles?.colors;
  const typography = globalStyles?.typography;

  return (
    <div className="p-4">
      {/* Preview Image */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ImageIcon size={16} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              Layout Preview
            </h3>
          </div>
          {onUpdateScreenshot && (
            <button
              onClick={onUpdateScreenshot}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"
            >
              <RefreshIcon size={12} />
              Update
            </button>
          )}
        </div>
        {snapshot.previewImageUrl ? (
          <div className="relative rounded-lg overflow-hidden border border-slate-800">
            <img src={snapshot.previewImageUrl} alt="Layout preview" className="w-full h-auto" />
          </div>
        ) : (
          <div className="flex items-center justify-center h-40 bg-slate-800/50 rounded-lg border border-slate-700 border-dashed">
            <div className="text-center">
              <ImageIcon size={32} className="text-slate-600 mx-auto mb-2" />
              <div className="text-sm text-slate-500">No preview captured</div>
              <div className="text-xs text-slate-600">Preview will be captured when you save</div>
            </div>
          </div>
        )}
        <div className="text-xs text-slate-600 mt-2">
          Captured: {new Date(snapshot.capturedAt).toLocaleString()}
        </div>
      </div>

      {/* Color Palette */}
      {colors && (
        <Section icon={<PaletteIcon size={16} />} title="Colors">
          <div className="grid grid-cols-2 gap-3 bg-slate-800/30 rounded-lg p-3">
            {colors.primary && <ColorSwatch color={colors.primary} label="Primary" />}
            {colors.secondary && <ColorSwatch color={colors.secondary} label="Secondary" />}
            {colors.accent && <ColorSwatch color={colors.accent} label="Accent" />}
            {colors.background && <ColorSwatch color={colors.background} label="Background" />}
            {colors.surface && <ColorSwatch color={colors.surface} label="Surface" />}
            {colors.text && <ColorSwatch color={colors.text} label="Text" />}
          </div>
        </Section>
      )}

      {/* Typography */}
      {typography && (
        <Section icon={<LayoutIcon size={16} />} title="Typography">
          <div className="space-y-2 bg-slate-800/30 rounded-lg p-3">
            {typography.fontFamily && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Font Family</span>
                <span className="text-slate-300 font-medium">{typography.fontFamily}</span>
              </div>
            )}
            {typography.headingFont && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Heading Font</span>
                <span className="text-slate-300 font-medium">{typography.headingFont}</span>
              </div>
            )}
            {typography.headingSize && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Heading Size</span>
                <span className="text-slate-300 font-medium">{typography.headingSize}</span>
              </div>
            )}
            {typography.bodySize && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Body Size</span>
                <span className="text-slate-300 font-medium">{typography.bodySize}</span>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Layout Structure */}
      <Section icon={<LayoutIcon size={16} />} title="Structure">
        <div className="grid grid-cols-3 gap-2 bg-slate-800/30 rounded-lg p-3">
          {[
            { key: 'hasHeader', label: 'Header' },
            { key: 'hasSidebar', label: 'Sidebar' },
            { key: 'hasFooter', label: 'Footer' },
          ].map(({ key, label }) => {
            const value = design?.structure?.[key as keyof NonNullable<typeof design>['structure']];
            return (
              <div
                key={key}
                className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs ${
                  value ? 'bg-garden-500/10 text-garden-400' : 'bg-slate-800/50 text-slate-600'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${value ? 'bg-garden-400' : 'bg-slate-600'}`}
                />
                {label}
              </div>
            );
          })}
        </div>
        {design?.basePreferences && (
          <div className="mt-2 text-xs text-slate-500">
            Style: {design.basePreferences.style} | Layout: {design.basePreferences.layout}
          </div>
        )}
      </Section>

      {/* Effects */}
      {globalStyles?.effects && (
        <Section icon={<SparklesIcon size={16} />} title="Effects" defaultExpanded={false}>
          <div className="space-y-1 bg-slate-800/30 rounded-lg p-3 text-xs">
            {globalStyles.effects.borderRadius && (
              <div className="flex justify-between">
                <span className="text-slate-500">Border Radius</span>
                <span className="text-slate-300">{globalStyles.effects.borderRadius}</span>
              </div>
            )}
            {globalStyles.effects.shadows && (
              <div className="flex justify-between">
                <span className="text-slate-500">Shadows</span>
                <span className="text-slate-300">{globalStyles.effects.shadows}</span>
              </div>
            )}
            {globalStyles.effects.animations && (
              <div className="flex justify-between">
                <span className="text-slate-500">Animations</span>
                <span className="text-slate-300">{globalStyles.effects.animations}</span>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Design Notes */}
      {snapshot.designNotes && (
        <Section icon={<LayoutIcon size={16} />} title="Notes" defaultExpanded={false}>
          <div className="bg-slate-800/30 rounded-lg p-3 text-xs text-slate-400">
            {snapshot.designNotes}
          </div>
        </Section>
      )}
    </div>
  );
}

export default DesignTab;
