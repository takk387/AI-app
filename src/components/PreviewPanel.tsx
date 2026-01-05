'use client';

import React from 'react';
import CodePreview from './CodePreview';
import FullAppPreview from './FullAppPreview';
import BranchSelector from './BranchSelector';
import type { GeneratedComponent, ActiveTab } from '../types/aiBuilderTypes';
import {
  EyeIcon,
  CodeIcon,
  UndoIcon,
  RedoIcon,
  PackageIcon,
  DownloadIcon,
  MessageSquareIcon,
  LoaderIcon,
} from './ui/Icons';

/**
 * Check if a component has valid JSON code to preview
 */
function hasValidCode(component: GeneratedComponent | null): boolean {
  if (!component) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[PreviewPanel] hasValidCode: no component');
    }
    return false;
  }
  if (!component.code || component.code.trim() === '') {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[PreviewPanel] hasValidCode: component has no code', {
        id: component.id,
        name: component.name,
      });
    }
    return false;
  }
  try {
    const parsed = JSON.parse(component.code);
    const isValid =
      parsed && parsed.files && Array.isArray(parsed.files) && parsed.files.length > 0;
    if (!isValid && process.env.NODE_ENV === 'development') {
      console.debug('[PreviewPanel] hasValidCode: parsed but invalid structure', {
        id: component.id,
        name: component.name,
        hasFiles: !!parsed?.files,
        filesIsArray: Array.isArray(parsed?.files),
        filesLength: parsed?.files?.length ?? 0,
      });
    }
    return isValid;
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[PreviewPanel] hasValidCode: JSON parse failed', {
        id: component.id,
        name: component.name,
        error: e instanceof Error ? e.message : 'Unknown error',
        codePreview: component.code.slice(0, 100),
      });
    }
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
  onExport: (component: GeneratedComponent) => void;
  onDownload: () => void;

  // Branch management
  onBranchSwitch?: (branchId: string) => void;
  onCreateBranch?: () => void;
  onDeleteBranch?: (branchId: string) => void;

  // Loading states
  isExporting?: boolean;

  // Screenshot capture
  onScreenshot?: (image: string) => void;
}

// ============================================================================
// PREVIEW PANEL COMPONENT
// ============================================================================

export const PreviewPanel: React.FC<PreviewPanelProps> = React.memo(function PreviewPanel({
  currentComponent,
  activeTab,
  onTabChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  undoCount = 0,
  redoCount = 0,
  onExport,
  onDownload,
  onBranchSwitch,
  onCreateBranch,
  onDeleteBranch,
  isExporting = false,
  onScreenshot,
}) {
  return (
    <div
      className="rounded-xl overflow-hidden h-full flex flex-col"
      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
    >
      {/* Tabs Header */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        {/* Tab Buttons */}
        <button
          onClick={() => onTabChange('preview')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'preview' || (activeTab === 'chat' && currentComponent) ? '' : ''
          }`}
          style={
            activeTab === 'preview' || (activeTab === 'chat' && currentComponent)
              ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }
              : { color: 'var(--text-secondary)' }
          }
        >
          <EyeIcon size={16} />
          Preview
        </button>
        <button
          onClick={() => onTabChange('code')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'code' ? '' : ''
          }`}
          style={
            activeTab === 'code'
              ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }
              : { color: 'var(--text-secondary)' }
          }
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

            {/* Branch Selector Dropdown - always shows */}
            {onBranchSwitch && onCreateBranch && (
              <BranchSelector
                branches={currentComponent.branches || []}
                activeBranchId={currentComponent.activeBranchId || 'main'}
                onBranchSwitch={onBranchSwitch}
                onCreateBranch={onCreateBranch}
                onDeleteBranch={onDeleteBranch}
              />
            )}
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
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <MessageSquareIcon size={32} style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              {currentComponent ? 'Building Your App' : 'Start Building'}
            </h3>
            <p className="text-sm max-w-sm" style={{ color: 'var(--text-secondary)' }}>
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
});

export default PreviewPanel;
