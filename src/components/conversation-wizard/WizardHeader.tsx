'use client';

import { WandIcon, PaletteIcon, XIcon } from '@/components/ui/Icons';
import type { LayoutManifest } from '@/types/schema';

interface WizardHeaderProps {
  appName?: string;
  currentLayoutManifest: LayoutManifest | null;
  importedLayoutManifest: LayoutManifest | null;
  onImportLayout: () => void;
  onRemoveLayout: () => void;
  onCancel: () => void;
}

/**
 * Header for the conversation wizard
 */
export function WizardHeader({
  appName,
  currentLayoutManifest,
  importedLayoutManifest,
  onImportLayout,
  onRemoveLayout,
  onCancel,
}: WizardHeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-6 py-4"
      style={{ borderBottom: '1px solid var(--border-color)' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gold-600/20 flex items-center justify-center">
          <WandIcon size={20} className="text-gold-400" />
        </div>
        <div>
          <h1 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            App Planning Assistant
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {appName ? `Planning: ${appName}` : 'Describe your app idea'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Import Layout Design Button */}
        {currentLayoutManifest && !importedLayoutManifest && (
          <button
            onClick={onImportLayout}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gold-600/20 text-gold-300 hover:bg-gold-600/30 rounded-lg border border-gold-500/30 transition-colors"
          >
            <PaletteIcon size={16} />
            Import Layout
          </button>
        )}
        {/* Show imported layout indicator */}
        {importedLayoutManifest && (
          <div className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600/20 text-green-300 rounded-lg border border-green-500/30">
            <PaletteIcon size={16} />
            <span>Layout Imported</span>
            <button onClick={onRemoveLayout} className="ml-1 hover:text-green-100">
              <XIcon size={14} />
            </button>
          </div>
        )}
        <button onClick={onCancel} className="btn-ghost text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default WizardHeader;
