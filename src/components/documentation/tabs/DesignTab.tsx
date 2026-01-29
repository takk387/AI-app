import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
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
  const router = useRouter();
  const savedLayoutManifests = useAppStore((state) => state.savedLayoutManifests);
  const setCurrentLayoutManifest = useAppStore((state) => state.setCurrentLayoutManifest);
  const setShowDocumentationPanel = useAppStore((state) => state.setShowDocumentationPanel);
  const setCurrentMode = useAppStore((state) => state.setCurrentMode);

  // Extract design system from layoutManifest (Gemini 3 structure)
  const manifest = snapshot.layoutManifest;
  const designSystem = manifest?.designSystem;
  const colors = designSystem?.colors || {};
  const fonts = designSystem?.fonts;

  const handleLoadLayout = useCallback(
    (layout: typeof manifest) => {
      if (!layout) return;
      setCurrentLayoutManifest(layout);
      // Switch to Design mode to see it
      setCurrentMode('PLAN'); // Initial plan mode, layout builder is accessible
      setShowDocumentationPanel(false);
      router.push('/app/design');
    },
    [setCurrentLayoutManifest, setCurrentMode, setShowDocumentationPanel, router]
  );

  return (
    <div className="p-4">
      {/* Existing Preview Image Section */}
      <div className="mb-6">
        {/* ... (existing preview code) ... */}
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

      {/* Saved Layouts Section */}
      {savedLayoutManifests.length > 0 && (
        <Section
          icon={<LayoutIcon size={16} />}
          title={`Saved Layouts (${savedLayoutManifests.length})`}
        >
          <div className="space-y-2">
            {savedLayoutManifests.map((layout, idx) => (
              <div
                key={layout.id || idx}
                className="bg-slate-800/30 rounded-lg p-3 flex items-center justify-between group hover:bg-slate-800/50 transition-colors"
              >
                <div>
                  <div className="text-xs font-medium text-slate-300">
                    {layout.id ? `Layout ${layout.id.slice(0, 8)}` : `Saved Layout ${idx + 1}`}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {layout.designSystem?.colors
                      ? Object.keys(layout.designSystem.colors).length
                      : 0}{' '}
                    Colors • {layout.detectedFeatures?.length || 0} Features
                  </div>
                </div>
                <button
                  onClick={() => handleLoadLayout(layout)}
                  className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-garden-600 hover:bg-garden-500 text-white text-xs rounded transition-all"
                >
                  Load
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Color Palette */}
      {Object.keys(colors).length > 0 && (
        <Section icon={<PaletteIcon size={16} />} title="Colors">
          <div className="grid grid-cols-2 gap-3 bg-slate-800/30 rounded-lg p-3">
            {Object.entries(colors).map(([key, value]) => (
              <ColorSwatch
                key={key}
                color={value}
                label={key.charAt(0).toUpperCase() + key.slice(1)}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Typography */}
      {fonts && (
        <Section icon={<LayoutIcon size={16} />} title="Typography">
          <div className="space-y-2 bg-slate-800/30 rounded-lg p-3">
            {fonts.heading && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Heading Font</span>
                <span className="text-slate-300 font-medium">{fonts.heading}</span>
              </div>
            )}
            {fonts.body && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Body Font</span>
                <span className="text-slate-300 font-medium">{fonts.body}</span>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Layout Structure - Show detected features */}
      {manifest?.detectedFeatures && manifest.detectedFeatures.length > 0 && (
        <Section icon={<LayoutIcon size={16} />} title="Detected Features">
          <div className="flex flex-wrap gap-2 bg-slate-800/30 rounded-lg p-3">
            {manifest.detectedFeatures.map((feature) => (
              <span
                key={feature}
                className="px-2 py-1 text-xs bg-garden-500/10 text-garden-400 rounded"
              >
                {feature}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Manifest Info */}
      {manifest && (
        <Section icon={<SparklesIcon size={16} />} title="Manifest Info" defaultExpanded={false}>
          <div className="space-y-1 bg-slate-800/30 rounded-lg p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">ID</span>
              <span className="text-slate-300 font-mono">{manifest.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Version</span>
              <span className="text-slate-300">{manifest.version}</span>
            </div>
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
