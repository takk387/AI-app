'use client';

import React from 'react';
import CodePreview from './CodePreview';
import FullAppPreview from './FullAppPreview';
import type { GeneratedComponent, ActiveTab } from '../types/aiBuilderTypes';
import {
  EyeIcon,
  CodeIcon,
  UndoIcon,
  RedoIcon,
  ForkIcon,
  PackageIcon,
  DownloadIcon,
  MessageSquareIcon,
  LoaderIcon,
} from './ui/Icons';

/**
 * Check if a component has valid JSON code to preview
 */
function hasValidCode(component: GeneratedComponent | null): boolean {
  if (!component || !component.code || component.code.trim() === '') {
    return false;
  }
  try {
    const parsed = JSON.parse(component.code);
    return parsed && parsed.files && Array.isArray(parsed.files) && parsed.files.length > 0;
  } catch {
    return false;
  }
}

// ============================================================================
// PREVIEW PANEL PROPS
// ============================================================================

export interface PreviewPanelProps {
  // Current component
  currentComponent: GeneratedComponent | null;

  // Tab state
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;

  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  undoCount?: number;
  redoCount?: number;

  // Actions
  onFork: (component: GeneratedComponent) => void;
  onExport: (component: GeneratedComponent) => void;
  onDownload: () => void;

  // Loading states
  isExporting?: boolean;

  // Screenshot capture
  onScreenshot?: (image: string) => void;
}

// ============================================================================
// PREVIEW PANEL COMPONENT
// ============================================================================

export function PreviewPanel({
  currentComponent,
  activeTab,
  onTabChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  undoCount = 0,
  redoCount = 0,
  onFork,
  onExport,
  onDownload,
  isExporting = false,
  onScreenshot,
}: PreviewPanelProps) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden h-full flex flex-col">
      {/* Tabs Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
        {/* Tab Buttons */}
        <button
          onClick={() => onTabChange('preview')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'preview' || (activeTab === 'chat' && currentComponent)
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <EyeIcon size={16} />
          Preview
        </button>
        <button
          onClick={() => onTabChange('code')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'code'
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <CodeIcon size={16} />
          Code
        </button>

        {/* Component Actions (only when component exists) */}
        {currentComponent && (
          <>
            {/* Undo/Redo Controls */}
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="btn-icon disabled:opacity-30"
                title={`Undo${undoCount > 0 ? ` (${undoCount})` : ''}`}
              >
                <UndoIcon size={16} />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="btn-icon disabled:opacity-30"
                title={`Redo${redoCount > 0 ? ` (${redoCount})` : ''}`}
              >
                <RedoIcon size={16} />
              </button>
            </div>

            {/* Fork Button */}
            <button
              onClick={() => onFork(currentComponent)}
              className="btn-secondary"
              title="Fork this app"
            >
              <ForkIcon size={16} />
              <span className="hidden lg:inline">Fork</span>
            </button>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Export/Download Actions (only when component exists) */}
        {currentComponent && (
          <>
            <button
              onClick={() => onExport(currentComponent)}
              disabled={isExporting}
              className="btn-primary disabled:opacity-50"
            >
              {isExporting ? <LoaderIcon size={16} /> : <PackageIcon size={16} />}
              <span className="hidden sm:inline">Export</span>
            </button>
            <button onClick={onDownload} className="btn-secondary">
              <DownloadIcon size={16} />
              <span className="hidden sm:inline">Download</span>
            </button>
          </>
        )}
      </div>

      {/* Preview Content */}
      <div className="flex-1 p-6 overflow-auto min-h-0">
        {!currentComponent || !hasValidCode(currentComponent) ? (
          // Empty State - shown when no component or component has no valid code
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
              <MessageSquareIcon size={32} className="text-zinc-600" />
            </div>
            <h3 className="text-lg font-medium text-zinc-100 mb-2">
              {currentComponent ? 'Building Your App' : 'Start Building'}
            </h3>
            <p className="text-sm text-zinc-400 max-w-sm">
              {currentComponent
                ? 'Describe your app in the chat panel to generate the preview.'
                : 'Describe what you want to build in the chat panel, and your app will appear here.'}
            </p>
          </div>
        ) : (
          // Content based on active tab (default to preview when tab is 'chat')
          <>
            {(activeTab === 'preview' || activeTab === 'chat') && (
              <div className="h-full">
                <FullAppPreview appDataJson={currentComponent.code} onScreenshot={onScreenshot} />
              </div>
            )}

            {activeTab === 'code' && (
              <div className="h-full min-h-[500px]">
                <CodePreview code={currentComponent.code} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default PreviewPanel;
