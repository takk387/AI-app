"use client";

import React from 'react';
import CodePreview from './CodePreview';
import FullAppPreview from './FullAppPreview';
import type { GeneratedComponent, ActiveTab } from '../types/aiBuilderTypes';

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
}: PreviewPanelProps) {
  return (
    <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black/40 h-full flex flex-col">
      {/* Tabs Header */}
      <div className="flex items-center gap-2 px-6 py-4 border-b border-white/10 bg-black/30 backdrop-blur-sm">
        {/* Tab Buttons */}
        <button
          onClick={() => onTabChange('preview')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'preview'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          👁️ Preview
        </button>
        <button
          onClick={() => onTabChange('code')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'code'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          💻 Code
        </button>

        {/* Component Actions (only when component exists) */}
        {currentComponent && (
          <>
            {/* Undo/Redo Controls */}
            <div className="flex items-center gap-1 ml-2 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title={`Undo${undoCount > 0 ? ` (${undoCount})` : ''}`}
              >
                ↶
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title={`Redo${redoCount > 0 ? ` (${redoCount})` : ''}`}
              >
                ↷
              </button>
            </div>

            {/* Fork Button */}
            <button
              onClick={() => onFork(currentComponent)}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white text-sm font-medium transition-all flex items-center gap-2"
              title="Fork this app"
            >
              <span>🍴</span>
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
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-all hover:shadow-lg hover:shadow-purple-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              <span>{isExporting ? '⏳' : '📦'}</span>
              <span className="hidden sm:inline">Export & Deploy</span>
            </button>
            <button
              onClick={onDownload}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-all hover:shadow-lg hover:shadow-green-500/20 flex items-center gap-2"
            >
              <span>📥</span>
              <span className="hidden sm:inline">Download</span>
            </button>
          </>
        )}
      </div>

      {/* Preview Content */}
      <div className="flex-1 p-6 overflow-auto">
        {!currentComponent ? (
          // Empty State
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Start Building Your App
            </h3>
            <p className="text-slate-400 max-w-md">
              Describe what you want to build in the chat, and I&apos;ll create a complete app with live preview for you.
            </p>
          </div>
        ) : (
          // Content based on active tab
          <>
            {activeTab === 'preview' && (
              <div className="h-full">
                <FullAppPreview appDataJson={currentComponent.code} />
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
