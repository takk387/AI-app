'use client';

import React, { useState, useEffect } from 'react';
import { useThemeContext } from '../contexts/ThemeContext';

// New header components
import { ProjectDropdown, BuildDropdown, SettingsDropdown, ProjectInfo } from './header';
import { RocketIcon, LayoutIcon, WandIcon, SaveIcon, MenuIcon, XIcon } from './ui/Icons';

// ============================================================================
// TYPES
// ============================================================================

export type ExportFormat = 'html' | 'react' | 'zip' | 'clipboard';
export type ProjectStatus = 'draft' | 'saved' | 'generating' | 'error';
export type ViewType = 'chat' | 'code' | 'preview' | 'split';

export interface BuilderHeaderProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  projectStatus: ProjectStatus;
  lastSaved?: Date;
  hasUnsavedChanges: boolean;
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onNewProject: () => void;
  onSave: () => void;
  onExport: (format: ExportFormat) => void;
  onOpenSettings: () => void;
  onShare?: () => void;
  onHelp?: () => void;
  isSaving?: boolean;
  appVersion?: string;

  // AI Builder workflow props
  onWizard?: () => void;
  onLayoutBuilder?: () => void;
  onPhasedBuild?: () => void;
  showPhasedBuildPanel?: boolean;
  onTogglePhasedPanel?: () => void;
  isPhasedMode?: boolean;
  hasAppConcept?: boolean;

  // Version history
  versionCount?: number;
  onShowHistory?: () => void;
  showHistory?: boolean;

  // App library
  appCount?: number;
  onShowLibrary?: () => void;
  showLibrary?: boolean;

  // Current mode toggle
  currentMode?: 'PLAN' | 'ACT';
  onModeChange?: (mode: 'PLAN' | 'ACT') => void;

  // New app action
  onNewApp?: () => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }
}

// ============================================================================
// MOBILE MENU COMPONENT
// ============================================================================

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNewProject: () => void;
  onSave: () => void;
  onExport: (format: ExportFormat) => void;
  onOpenSettings: () => void;
  onHelp?: () => void;
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  isSaving?: boolean;
  onWizard?: () => void;
  onLayoutBuilder?: () => void;
  onPhasedBuild?: () => void;
  isPhasedMode?: boolean;
  hasAppConcept?: boolean;
  showPhasedBuildPanel?: boolean;
  onTogglePhasedPanel?: () => void;
  versionCount?: number;
  onShowHistory?: () => void;
  onNewApp?: () => void;
  onShowLibrary?: () => void;
  appCount?: number;
  theme: string;
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
}

function MobileMenu({
  isOpen,
  onClose,
  onNewProject,
  onSave,
  onExport,
  onOpenSettings,
  onHelp,
  currentView,
  onViewChange,
  isSaving,
  onWizard,
  onLayoutBuilder,
  onPhasedBuild,
  isPhasedMode,
  hasAppConcept,
  showPhasedBuildPanel,
  onTogglePhasedPanel,
  versionCount,
  onShowHistory,
  onNewApp,
  onShowLibrary,
  appCount,
  theme,
  onThemeChange,
}: MobileMenuProps) {
  if (!isOpen) return null;

  const viewModes: ViewType[] = ['chat', 'code', 'preview', 'split'];
  const exportFormats: { format: ExportFormat; label: string }[] = [
    { format: 'html', label: 'Export as HTML' },
    { format: 'react', label: 'Export as React' },
    { format: 'zip', label: 'Export as ZIP' },
    { format: 'clipboard', label: 'Copy to Clipboard' },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 md:hidden" onClick={onClose}>
      <div
        className="absolute right-0 top-0 h-full w-80 max-w-full bg-zinc-900 border-l border-zinc-800 p-6 space-y-6 animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Menu</h3>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-zinc-800 transition-colors">
            <XIcon size={20} className="text-zinc-400" />
          </button>
        </div>

        {/* View Controls */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-zinc-500">View</h4>
          <div className="grid grid-cols-2 gap-2">
            {viewModes.map((view) => (
              <button
                key={view}
                onClick={() => {
                  onViewChange(view);
                  onClose();
                }}
                className={`px-4 py-2.5 rounded-md text-sm font-medium transition-colors capitalize ${
                  currentView === view
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        {/* Build Actions */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-zinc-500">Build</h4>
          <div className="space-y-2">
            {onLayoutBuilder && (
              <button
                onClick={() => {
                  onLayoutBuilder();
                  onClose();
                }}
                className="w-full linear-btn-secondary justify-start"
              >
                <LayoutIcon size={16} />
                Layout Builder
              </button>
            )}
            {onWizard && (
              <button
                onClick={() => {
                  onWizard();
                  onClose();
                }}
                className="w-full linear-btn-secondary justify-start"
              >
                <WandIcon size={16} />
                Wizard
              </button>
            )}
            {hasAppConcept && onPhasedBuild && (
              <button
                onClick={() => {
                  onPhasedBuild();
                  onClose();
                }}
                className="w-full linear-btn-secondary justify-start"
              >
                Phased Build
              </button>
            )}
            {isPhasedMode && onTogglePhasedPanel && (
              <button
                onClick={() => {
                  onTogglePhasedPanel();
                  onClose();
                }}
                className={`w-full linear-btn-secondary justify-start ${showPhasedBuildPanel ? 'bg-zinc-700' : ''}`}
              >
                Phases
              </button>
            )}
            {versionCount !== undefined && versionCount > 0 && onShowHistory && (
              <button
                onClick={() => {
                  onShowHistory();
                  onClose();
                }}
                className="w-full linear-btn-secondary justify-start"
              >
                History
                <span className="ml-auto px-1.5 py-0.5 text-xs bg-zinc-700 rounded">
                  {versionCount}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Project Actions */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-zinc-500">Project</h4>
          <div className="space-y-2">
            {onNewApp && (
              <button
                onClick={() => {
                  onNewApp();
                  onClose();
                }}
                className="w-full linear-btn-secondary justify-start"
              >
                New App
              </button>
            )}
            {onShowLibrary && (
              <button
                onClick={() => {
                  onShowLibrary();
                  onClose();
                }}
                className="w-full linear-btn-secondary justify-start"
              >
                My Apps
                {appCount && appCount > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 text-xs bg-zinc-700 rounded">
                    {appCount}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => {
                onNewProject();
                onClose();
              }}
              className="w-full linear-btn-secondary justify-start"
            >
              New App
            </button>
            <button
              onClick={() => {
                onSave();
                onClose();
              }}
              disabled={isSaving}
              className="w-full linear-btn-primary justify-start disabled:opacity-50"
            >
              <SaveIcon size={16} />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Export Options */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-zinc-500">Export</h4>
          <div className="space-y-2">
            {exportFormats.map((option) => (
              <button
                key={option.format}
                onClick={() => {
                  onExport(option.format);
                  onClose();
                }}
                className="w-full linear-btn-secondary justify-start"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-zinc-500">Settings</h4>
          <div className="space-y-2">
            <button
              onClick={() => {
                onOpenSettings();
                onClose();
              }}
              className="w-full linear-btn-secondary justify-start"
            >
              Settings
            </button>
            {onHelp && (
              <button
                onClick={() => {
                  onHelp();
                  onClose();
                }}
                className="w-full linear-btn-secondary justify-start"
              >
                Help & Shortcuts
              </button>
            )}
          </div>
        </div>

        {/* Theme */}
        <div className="pt-4 border-t border-zinc-800">
          <h4 className="text-sm font-medium text-zinc-500 mb-2">Theme</h4>
          <div className="grid grid-cols-3 gap-2">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => onThemeChange(t)}
                className={`px-3 py-2 rounded-md text-sm capitalize transition-colors ${
                  theme === t
                    ? 'bg-zinc-700 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN BUILDER HEADER COMPONENT
// ============================================================================

export function BuilderHeader({
  projectName,
  onProjectNameChange,
  projectStatus,
  lastSaved,
  hasUnsavedChanges,
  currentView,
  onViewChange,
  onNewProject,
  onSave,
  onExport,
  onOpenSettings,
  onShare,
  onHelp,
  isSaving = false,
  appVersion = '1.0.0',
  onWizard,
  onLayoutBuilder,
  onPhasedBuild,
  showPhasedBuildPanel,
  onTogglePhasedPanel,
  isPhasedMode,
  hasAppConcept,
  versionCount,
  onShowHistory,
  appCount,
  onShowLibrary,
  currentMode: _currentMode,
  onModeChange: _onModeChange,
  onNewApp,
}: BuilderHeaderProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { theme, setTheme } = useThemeContext();

  // Close mobile menu on resize
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) {
        setShowMobileMenu(false);
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine status for ProjectInfo
  const statusMap: Record<ProjectStatus, 'draft' | 'saved' | 'generating' | 'error'> = {
    draft: hasUnsavedChanges ? 'draft' : 'draft',
    saved: 'saved',
    generating: 'generating',
    error: 'error',
  };

  return (
    <>
      <header className="linear-header">
        {/* ============================================
            BRANDING SECTION (LEFT)
        ============================================ */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Logo */}
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <RocketIcon size={16} className="text-white" />
          </div>
          {/* App Name & Version */}
          <div className="hidden sm:block">
            <h1 className="font-medium text-zinc-100 text-sm leading-tight">AI App Builder</h1>
            <p className="text-xs text-zinc-500 leading-tight">v{appVersion}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-6 bg-zinc-800" />

        {/* ============================================
            PROJECT INFO (CENTER-LEFT)
        ============================================ */}
        <div className="hidden md:block flex-1 min-w-0">
          <ProjectInfo
            projectName={projectName}
            status={statusMap[projectStatus]}
            lastSaved={lastSaved ? getRelativeTime(lastSaved) : undefined}
            onRename={onProjectNameChange}
          />
        </div>

        {/* ============================================
            DROPDOWN MENUS
        ============================================ */}
        <div className="hidden md:flex items-center gap-1">
          <ProjectDropdown
            onNewProject={onNewProject}
            onMyApps={onShowLibrary}
            onExportHTML={() => onExport('html')}
            onExportReact={() => onExport('react')}
            onExportZip={() => onExport('zip')}
            onCopyToClipboard={() => onExport('clipboard')}
            onShare={onShare}
            appCount={appCount}
            showShare={!!onShare}
          />

          <BuildDropdown
            showPhasedBuild={!!hasAppConcept && !!onPhasedBuild}
            showPhasesToggle={!!isPhasedMode && !!onTogglePhasedPanel}
            showVersionHistory={!!versionCount && versionCount > 0 && !!onShowHistory}
            isPhasedMode={showPhasedBuildPanel}
            versionCount={versionCount}
            onPhasedBuild={onPhasedBuild}
            onTogglePhases={onTogglePhasedPanel}
            onVersionHistory={onShowHistory}
          />
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-6 bg-zinc-800" />

        {/* ============================================
            PRIMARY ACTIONS
        ============================================ */}
        <div className="hidden md:flex items-center gap-2">
          {/* Layout Builder - Always visible */}
          {onLayoutBuilder && (
            <button onClick={onLayoutBuilder} className="linear-btn-ghost" title="Layout Builder">
              <LayoutIcon size={16} />
              <span className="hidden lg:inline">Layout</span>
            </button>
          )}

          {/* Wizard - Always visible */}
          {onWizard && (
            <button onClick={onWizard} className="linear-btn-ghost" title="App Wizard">
              <WandIcon size={16} />
              <span className="hidden lg:inline">Wizard</span>
            </button>
          )}

          {/* Save - Primary action */}
          <button
            onClick={onSave}
            disabled={isSaving || projectStatus === 'generating'}
            className="linear-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            title="Save (Ctrl+S)"
          >
            <SaveIcon size={16} />
            <span className="hidden lg:inline">{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>

        {/* Spacer for mobile */}
        <div className="flex-1 md:hidden" />

        {/* Mobile status indicator */}
        <div className="md:hidden flex items-center gap-2 text-sm text-zinc-400">
          <span
            className={`status-dot ${
              projectStatus === 'saved'
                ? 'status-dot-saved'
                : projectStatus === 'generating'
                  ? 'status-dot-generating'
                  : projectStatus === 'error'
                    ? 'status-dot-error'
                    : 'status-dot-draft'
            }`}
          />
          <span className="capitalize">{projectStatus}</span>
        </div>

        {/* ============================================
            SETTINGS (RIGHT)
        ============================================ */}
        <div className="hidden md:block">
          <SettingsDropdown
            theme={theme as 'light' | 'dark' | 'system'}
            onThemeChange={setTheme}
            onSettings={onOpenSettings}
            onHelp={onHelp}
          />
        </div>

        {/* ============================================
            MOBILE MENU BUTTON
        ============================================ */}
        <button
          onClick={() => setShowMobileMenu(true)}
          className="md:hidden w-9 h-9 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 flex items-center justify-center transition-colors"
          title="Menu"
        >
          <MenuIcon size={18} />
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      <MobileMenu
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
        onNewProject={onNewProject}
        onSave={onSave}
        onExport={onExport}
        onOpenSettings={onOpenSettings}
        onHelp={onHelp}
        currentView={currentView}
        onViewChange={onViewChange}
        isSaving={isSaving}
        onWizard={onWizard}
        onLayoutBuilder={onLayoutBuilder}
        onPhasedBuild={onPhasedBuild}
        isPhasedMode={isPhasedMode}
        hasAppConcept={hasAppConcept}
        showPhasedBuildPanel={showPhasedBuildPanel}
        onTogglePhasedPanel={onTogglePhasedPanel}
        versionCount={versionCount}
        onShowHistory={onShowHistory}
        onNewApp={onNewApp}
        onShowLibrary={onShowLibrary}
        appCount={appCount}
        theme={theme}
        onThemeChange={setTheme}
      />
    </>
  );
}

export default BuilderHeader;
