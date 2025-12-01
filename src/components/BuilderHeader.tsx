"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ThemeToggle from './ThemeToggle';

// ============================================================================
// TYPES
// ============================================================================

/** Available export formats for the project */
export type ExportFormat = 'html' | 'react' | 'zip' | 'clipboard';

/** Project status states */
export type ProjectStatus = 'draft' | 'saved' | 'generating' | 'error';

/** Available view modes for the builder */
export type ViewType = 'chat' | 'code' | 'preview' | 'split';

export interface BuilderHeaderProps {
  /** Current project name */
  projectName: string;
  /** Callback when project name changes */
  onProjectNameChange: (name: string) => void;
  /** Current project status */
  projectStatus: ProjectStatus;
  /** Last saved timestamp */
  lastSaved?: Date;
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Current view mode */
  currentView: ViewType;
  /** Callback when view changes */
  onViewChange: (view: ViewType) => void;
  /** Callback for creating new project */
  onNewProject: () => void;
  /** Callback for saving project */
  onSave: () => void;
  /** Callback for exporting project */
  onExport: (format: ExportFormat) => void;
  /** Callback for opening settings */
  onOpenSettings: () => void;
  /** Optional callback for sharing */
  onShare?: () => void;
  /** Optional callback for help */
  onHelp?: () => void;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** App version to display */
  appVersion?: string;
  
  // AI Builder workflow props
  /** Opens AppConceptWizard */
  onPlanApp?: () => void;
  /** Opens ConversationalAppWizard */
  onWizard?: () => void;
  /** Starts phased build */
  onPhasedBuild?: () => void;
  /** Is phased panel visible */
  showPhasedBuildPanel?: boolean;
  /** Toggle phased panel */
  onTogglePhasedPanel?: () => void;
  /** Is in phased build mode */
  isPhasedMode?: boolean;
  /** Has an app concept defined */
  hasAppConcept?: boolean;
  
  // Version history
  /** Number of versions */
  versionCount?: number;
  /** Open version history */
  onShowHistory?: () => void;
  /** Is history open */
  showHistory?: boolean;
  
  // App library
  /** Number of saved apps */
  appCount?: number;
  /** Open library */
  onShowLibrary?: () => void;
  /** Is library open */
  showLibrary?: boolean;
  
  // Current mode toggle
  /** Current Plan/Act mode */
  currentMode?: 'PLAN' | 'ACT';
  /** Callback when mode changes */
  onModeChange?: (mode: 'PLAN' | 'ACT') => void;
  
  // New app action
  /** Create new app/conversation */
  onNewApp?: () => void;
}

// ============================================================================
// SHARED CONSTANTS
// ============================================================================

/** Export options configuration */
const EXPORT_OPTIONS: { format: ExportFormat; icon: string; label: string; description: string }[] = [
  { format: 'html', icon: '🌐', label: 'Export as HTML', description: 'Static HTML files' },
  { format: 'react', icon: '⚛️', label: 'Export as React', description: 'Next.js project' },
  { format: 'zip', icon: '📦', label: 'Export as ZIP', description: 'Complete package' },
  { format: 'clipboard', icon: '📋', label: 'Copy to Clipboard', description: 'Copy code' },
];

/** View options configuration */
const VIEW_OPTIONS: { id: ViewType; icon: string; label: string }[] = [
  { id: 'chat', icon: '💬', label: 'Chat' },
  { id: 'code', icon: '💻', label: 'Code' },
  { id: 'preview', icon: '👁️', label: 'Preview' },
  { id: 'split', icon: '⊞', label: 'Split' },
];

/** Keyboard shortcuts configuration */
const KEYBOARD_SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Ctrl+S', action: 'Save project' },
  { keys: 'Ctrl+N', action: 'New project' },
  { keys: 'Ctrl+Z', action: 'Undo' },
  { keys: 'Ctrl+Shift+Z', action: 'Redo' },
  { keys: 'Ctrl+/', action: 'Toggle view' },
];

// ============================================================================
// STATUS INDICATOR COMPONENT
// ============================================================================

interface StatusIndicatorProps {
  status: ProjectStatus;
  hasUnsavedChanges: boolean;
}

function StatusIndicator({ status, hasUnsavedChanges }: StatusIndicatorProps) {
  const statusConfig = {
    draft: {
      icon: '📝',
      text: 'Draft',
      className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    },
    saved: {
      icon: '✓',
      text: 'Saved',
      className: 'bg-green-500/20 text-green-400 border-green-500/30',
    },
    generating: {
      icon: '⏳',
      text: 'Generating...',
      className: 'bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse',
    },
    error: {
      icon: '⚠️',
      text: 'Error',
      className: 'bg-red-500/20 text-red-400 border-red-500/30',
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <span
        className={`
          inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border
          ${config.className}
        `}
      >
        <span>{config.icon}</span>
        <span>{config.text}</span>
      </span>
      {hasUnsavedChanges && status !== 'generating' && (
        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" title="Unsaved changes" />
      )}
    </div>
  );
}

// ============================================================================
// EXPORT DROPDOWN COMPONENT
// ============================================================================

interface ExportDropdownProps {
  onExport: (format: ExportFormat) => void;
  isOpen: boolean;
  onClose: () => void;
}

function ExportDropdown({ onExport, isOpen, onClose }: ExportDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="
        absolute top-full right-0 mt-2 w-56
        bg-slate-800 border border-white/10
        rounded-xl shadow-2xl shadow-black/40
        py-2 z-50
        animate-in fade-in slide-in-from-top-2 duration-200
      "
      role="menu"
      aria-orientation="vertical"
    >
      {EXPORT_OPTIONS.map((option) => (
        <button
          key={option.format}
          onClick={() => {
            onExport(option.format);
            onClose();
          }}
          className="
            w-full px-4 py-3 text-left flex items-center gap-3
            hover:bg-white/10 transition-colors
          "
          role="menuitem"
          aria-label={`${option.label} - ${option.description}`}
        >
          <span className="text-xl" aria-hidden="true">{option.icon}</span>
          <div>
            <div className="text-sm font-medium text-white">{option.label}</div>
            <div className="text-xs text-slate-400">{option.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// VIEW TOGGLE COMPONENT
// ============================================================================

interface ViewToggleProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center bg-slate-800/50 rounded-lg p-1 border border-white/10" role="group" aria-label="View selection">
      {VIEW_OPTIONS.map((view) => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          aria-label={`Switch to ${view.label} view`}
          aria-pressed={currentView === view.id}
          className={`
            px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5
            ${currentView === view.id
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
            }
          `}
          title={view.label}
        >
          <span aria-hidden="true">{view.icon}</span>
          <span className="hidden lg:inline">{view.label}</span>
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// INLINE EDITABLE PROJECT NAME
// ============================================================================

interface EditableProjectNameProps {
  name: string;
  onChange: (name: string) => void;
}

function EditableProjectName({ name, onChange }: EditableProjectNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(name);
  }, [name]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSubmit = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== name) {
      onChange(trimmed);
    } else {
      setEditValue(name);
    }
    setIsEditing(false);
  }, [editValue, name, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setEditValue(name);
      setIsEditing(false);
    }
  }, [handleSubmit, name]);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={handleKeyDown}
        className="
          bg-slate-800 border border-blue-500 rounded-lg px-3 py-1.5
          text-white font-semibold text-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500/50
          min-w-[200px]
        "
        maxLength={50}
      />
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="
        group flex items-center gap-2 px-3 py-1.5 rounded-lg
        hover:bg-white/10 transition-all
      "
      title="Click to rename project"
    >
      <span className="text-lg">📄</span>
      <span className="font-semibold text-white text-lg">{name}</span>
      <span className="text-slate-500 group-hover:text-slate-300 transition-colors text-sm">
        ✏️
      </span>
    </button>
  );
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
  // AI Builder workflow props
  onPlanApp?: () => void;
  onWizard?: () => void;
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
  onPlanApp,
  onWizard,
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
}: MobileMenuProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 md:hidden"
      onClick={onClose}
    >
      <div
        className="
          absolute right-0 top-0 h-full w-80 max-w-full
          bg-slate-900 border-l border-white/10
          p-6 space-y-6
          animate-in slide-in-from-right duration-300
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Menu</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <span className="text-slate-400 text-xl">✕</span>
          </button>
        </div>

        {/* View Controls */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-400">View</h4>
          <div className="grid grid-cols-2 gap-2">
            {(['chat', 'code', 'preview', 'split'] as ViewType[]).map((view) => (
              <button
                key={view}
                onClick={() => {
                  onViewChange(view);
                  onClose();
                }}
                className={`
                  px-4 py-3 rounded-lg text-sm font-medium transition-all capitalize
                  ${currentView === view
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }
                `}
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-400">Actions</h4>
          <div className="space-y-2">
            {onPlanApp && (
              <button
                onClick={() => {
                  onPlanApp();
                  onClose();
                }}
                className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-left hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-3"
              >
                <span>🚀</span>
                <span>Plan App</span>
              </button>
            )}
            {onWizard && (
              <button
                onClick={() => {
                  onWizard();
                  onClose();
                }}
                className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-left hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center gap-3"
              >
                <span>🧙‍♂️</span>
                <span>Wizard</span>
              </button>
            )}
            {hasAppConcept && onPhasedBuild && (
              <button
                onClick={() => {
                  onPhasedBuild();
                  onClose();
                }}
                className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 text-white text-left hover:from-orange-700 hover:to-amber-700 transition-all flex items-center gap-3"
              >
                <span>🏗️</span>
                <span>Phased Build</span>
              </button>
            )}
            {isPhasedMode && onTogglePhasedPanel && (
              <button
                onClick={() => {
                  onTogglePhasedPanel();
                  onClose();
                }}
                className={`w-full px-4 py-3 rounded-lg text-left transition-all flex items-center gap-3 ${
                  showPhasedBuildPanel
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>📊</span>
                <span>Phases</span>
              </button>
            )}
            {versionCount !== undefined && versionCount > 0 && onShowHistory && (
              <button
                onClick={() => {
                  onShowHistory();
                  onClose();
                }}
                className="w-full px-4 py-3 rounded-lg bg-slate-800 text-white text-left hover:bg-slate-700 transition-colors flex items-center gap-3"
              >
                <span>🕒</span>
                <span>History</span>
                <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {versionCount}
                </span>
              </button>
            )}
            {onNewApp && (
              <button
                onClick={() => {
                  onNewApp();
                  onClose();
                }}
                className="w-full px-4 py-3 rounded-lg bg-slate-800 text-white text-left hover:bg-slate-700 transition-colors flex items-center gap-3"
              >
                <span>✨</span>
                <span>New App</span>
              </button>
            )}
            {onShowLibrary && (
              <button
                onClick={() => {
                  onShowLibrary();
                  onClose();
                }}
                className="w-full px-4 py-3 rounded-lg bg-slate-800 text-white text-left hover:bg-slate-700 transition-colors flex items-center gap-3"
              >
                <span>📂</span>
                <span>My Apps</span>
                {appCount && appCount > 0 && (
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-0.5 rounded-full">
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
              className="w-full px-4 py-3 rounded-lg bg-slate-800 text-white text-left hover:bg-slate-700 transition-colors flex items-center gap-3"
            >
              <span>➕</span>
              <span>New Project</span>
            </button>
            <button
              onClick={() => {
                onSave();
                onClose();
              }}
              disabled={isSaving}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 text-white text-left hover:bg-slate-700 transition-colors flex items-center gap-3 disabled:opacity-50"
            >
              <span>{isSaving ? '⏳' : '💾'}</span>
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* Export Options */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-400">Export</h4>
          <div className="space-y-2">
            {EXPORT_OPTIONS.map((option) => (
              <button
                key={option.format}
                onClick={() => {
                  onExport(option.format);
                  onClose();
                }}
                className="w-full px-4 py-3 rounded-lg bg-slate-800 text-white text-left hover:bg-slate-700 transition-colors flex items-center gap-3"
                aria-label={option.label}
              >
                <span aria-hidden="true">{option.icon}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-400">Settings</h4>
          <div className="space-y-2">
            <button
              onClick={() => {
                onOpenSettings();
                onClose();
              }}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 text-white text-left hover:bg-slate-700 transition-colors flex items-center gap-3"
            >
              <span>⚙️</span>
              <span>Settings</span>
            </button>
            {onHelp && (
              <button
                onClick={() => {
                  onHelp();
                  onClose();
                }}
                className="w-full px-4 py-3 rounded-lg bg-slate-800 text-white text-left hover:bg-slate-700 transition-colors flex items-center gap-3"
              >
                <span>❓</span>
                <span>Help & Shortcuts</span>
              </button>
            )}
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Theme</span>
            <ThemeToggle size="md" showDropdown={true} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// RELATIVE TIME HELPER
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
  // AI Builder workflow props
  onPlanApp,
  onWizard,
  onPhasedBuild,
  showPhasedBuildPanel,
  onTogglePhasedPanel,
  isPhasedMode,
  hasAppConcept,
  // Version history
  versionCount,
  onShowHistory,
  showHistory,
  // App library
  appCount,
  onShowLibrary,
  showLibrary,
  // Current mode toggle
  currentMode,
  onModeChange,
  // New app action
  onNewApp,
}: BuilderHeaderProps) {
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);

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

  // Keyboard shortcuts hint dropdown
  const keyboardHintsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (keyboardHintsRef.current && !keyboardHintsRef.current.contains(event.target as Node)) {
        setShowKeyboardHints(false);
      }
    }
    if (showKeyboardHints) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showKeyboardHints]);

  return (
    <>
      <header
        className="
          border-b border-white/10 backdrop-blur-xl
          sticky top-0 z-50
          shadow-2xl shadow-black/40
          bg-slate-900/80
        "
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10" aria-hidden="true"></div>
        <div className="px-4 lg:px-6 h-16 flex items-center gap-4 relative">
          {/* ============================================
              BRANDING SECTION (LEFT)
          ============================================ */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Logo */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-xl">🚀</span>
            </div>
            {/* App Name & Version */}
            <div className="hidden sm:block">
              <h1 className="font-bold text-white text-lg leading-tight">AI App</h1>
              <p className="text-xs text-slate-400 leading-tight">Builder v{appVersion}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px h-8 bg-white/10" />

          {/* ============================================
              PROJECT INFO (CENTER-LEFT)
          ============================================ */}
          <div className="hidden md:flex items-center gap-3 flex-1 min-w-0">
            {/* Project Name (Editable) */}
            <EditableProjectName
              name={projectName}
              onChange={onProjectNameChange}
            />

            {/* Status Indicator */}
            <StatusIndicator
              status={projectStatus}
              hasUnsavedChanges={hasUnsavedChanges}
            />

            {/* Last Saved */}
            {lastSaved && projectStatus !== 'generating' && (
              <span className="text-xs text-slate-500 hidden lg:inline">
                Saved {getRelativeTime(lastSaved)}
              </span>
            )}
          </div>

          {/* ============================================
              ACTION BUTTONS (CENTER-RIGHT)
          ============================================ */}
          <div className="hidden md:flex items-center gap-2">
            {/* Plan App Button */}
            {onPlanApp && (
              <button
                onClick={onPlanApp}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-300 text-sm text-white font-medium flex items-center gap-2 hover:scale-105 active:scale-95 shadow-lg group"
              >
                <span className="group-hover:scale-125 transition-transform duration-300">🚀</span>
                <span className="hidden sm:inline">Plan App</span>
              </button>
            )}

            {/* Wizard Button */}
            {onWizard && (
              <button
                onClick={onWizard}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 text-sm text-white font-medium flex items-center gap-2 hover:scale-105 active:scale-95 shadow-lg group"
                title="Chat-based app planning wizard"
              >
                <span className="group-hover:scale-125 transition-transform duration-300">🧙‍♂️</span>
                <span className="hidden sm:inline">Wizard</span>
              </button>
            )}

            {/* Phased Build Button */}
            {hasAppConcept && onPhasedBuild && (
              <button
                onClick={onPhasedBuild}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 transition-all duration-300 text-sm text-white font-medium flex items-center gap-2 hover:scale-105 active:scale-95 shadow-lg group"
                title="Start advanced phased build"
              >
                <span className="group-hover:scale-125 transition-transform duration-300">🏗️</span>
                <span className="hidden sm:inline">Phased Build</span>
              </button>
            )}

            {/* Phases Toggle Button */}
            {isPhasedMode && onTogglePhasedPanel && (
              <button
                onClick={onTogglePhasedPanel}
                className={`px-4 py-2 rounded-lg transition-all duration-300 text-sm font-medium flex items-center gap-2 hover:scale-105 active:scale-95 shadow-lg ${
                  showPhasedBuildPanel
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-slate-800/50 border border-orange-500/30 text-orange-400 hover:text-white hover:border-orange-500/60'
                }`}
                title="Toggle phased build panel"
              >
                <span>📊</span>
                <span className="hidden sm:inline">Phases</span>
              </button>
            )}

            {/* Version History Button */}
            {versionCount !== undefined && versionCount > 0 && onShowHistory && (
              <button
                onClick={onShowHistory}
                className="px-4 py-2 rounded-lg bg-slate-800/50 border border-white/20 transition-all duration-300 text-sm text-slate-300 hover:text-white flex items-center gap-2 hover:scale-105 active:scale-95 shadow-lg group"
              >
                <span className="group-hover:scale-125 transition-transform duration-300">🕒</span>
                <span className="hidden sm:inline">History</span>
                <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs px-2 py-0.5 rounded-full shadow-lg">
                  {versionCount}
                </span>
              </button>
            )}

            {/* New App Button */}
            {onNewApp && (
              <button
                onClick={onNewApp}
                className="px-4 py-2 rounded-lg bg-slate-800/50 border border-white/20 transition-all duration-300 text-sm text-slate-300 hover:text-white flex items-center gap-2 hover:scale-105 active:scale-95 shadow-lg group"
              >
                <span className="group-hover:scale-125 transition-transform duration-300">✨</span>
                <span className="hidden sm:inline">New App</span>
              </button>
            )}

            {/* My Apps Button */}
            {onShowLibrary && (
              <button
                onClick={onShowLibrary}
                className="px-4 py-2 rounded-lg bg-slate-800/50 border border-white/20 transition-all duration-300 text-sm text-slate-300 hover:text-white flex items-center gap-2 hover:scale-105 active:scale-95 shadow-lg group"
              >
                <span className="group-hover:scale-125 transition-transform duration-300">📂</span>
                <span className="hidden sm:inline">My Apps</span>
                {appCount && appCount > 0 && (
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-0.5 rounded-full shadow-lg">
                    {appCount}
                  </span>
                )}
              </button>
            )}

            {/* New Project */}
            <button
              onClick={onNewProject}
              className="
                px-3 py-2 rounded-lg
                bg-slate-800 hover:bg-slate-700
                border border-white/10
                text-white text-sm font-medium
                transition-all hover:scale-105 active:scale-95
                flex items-center gap-2
              "
              title="New Project (Ctrl+N)"
            >
              <span>➕</span>
              <span className="hidden lg:inline">New</span>
            </button>

            {/* Save */}
            <button
              onClick={onSave}
              disabled={isSaving || projectStatus === 'generating'}
              className="
                px-3 py-2 rounded-lg
                bg-blue-600 hover:bg-blue-700
                text-white text-sm font-medium
                transition-all hover:scale-105 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                flex items-center gap-2
              "
              title="Save (Ctrl+S)"
            >
              <span>{isSaving ? '⏳' : '💾'}</span>
              <span className="hidden lg:inline">{isSaving ? 'Saving...' : 'Save'}</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="
                  px-3 py-2 rounded-lg
                  bg-purple-600 hover:bg-purple-700
                  text-white text-sm font-medium
                  transition-all hover:scale-105 active:scale-95
                  flex items-center gap-2
                "
                title="Export"
              >
                <span>📦</span>
                <span className="hidden lg:inline">Export</span>
                <span className="text-xs">▼</span>
              </button>
              <ExportDropdown
                onExport={onExport}
                isOpen={showExportDropdown}
                onClose={() => setShowExportDropdown(false)}
              />
            </div>

            {/* Share (optional) */}
            {onShare && (
              <button
                onClick={onShare}
                className="
                  px-3 py-2 rounded-lg
                  bg-slate-800 hover:bg-slate-700
                  border border-white/10
                  text-white text-sm font-medium
                  transition-all hover:scale-105 active:scale-95
                  flex items-center gap-2
                "
                title="Share"
              >
                <span>🔗</span>
                <span className="hidden lg:inline">Share</span>
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px h-8 bg-white/10" />

          {/* ============================================
              VIEW CONTROLS
          ============================================ */}
          <div className="hidden md:flex items-center gap-2">
            <ViewToggle currentView={currentView} onViewChange={onViewChange} />

            {/* Plan/Act Mode Toggle */}
            {currentMode && onModeChange && (
              <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg border border-white/10">
                <button
                  onClick={() => onModeChange('PLAN')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    currentMode === 'PLAN'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Plan Mode: AI discusses and explains (no code changes)"
                >
                  💭 Plan
                </button>
                <button
                  onClick={() => onModeChange('ACT')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    currentMode === 'ACT'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Act Mode: AI can modify code"
                >
                  ⚡ Act
                </button>
              </div>
            )}
          </div>

          {/* Spacer for mobile */}
          <div className="flex-1 md:hidden" />

          {/* Mobile project status */}
          <div className="md:hidden">
            <StatusIndicator
              status={projectStatus}
              hasUnsavedChanges={hasUnsavedChanges}
            />
          </div>

          {/* ============================================
              SETTINGS & USER (RIGHT)
          ============================================ */}
          <div className="hidden md:flex items-center gap-2">
            {/* Theme Toggle */}
            <ThemeToggle size="sm" showDropdown={true} />

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              className="
                w-9 h-9 rounded-lg
                bg-slate-800 hover:bg-slate-700
                border border-white/10
                text-slate-300 hover:text-white
                transition-all hover:scale-105 active:scale-95
                flex items-center justify-center
              "
              title="Settings"
            >
              <span>⚙️</span>
            </button>

            {/* Help / Keyboard Shortcuts */}
            <div className="relative" ref={keyboardHintsRef}>
              <button
                onClick={() => {
                  if (onHelp) {
                    onHelp();
                  } else {
                    setShowKeyboardHints(!showKeyboardHints);
                  }
                }}
                className="
                  w-9 h-9 rounded-lg
                  bg-slate-800 hover:bg-slate-700
                  border border-white/10
                  text-slate-300 hover:text-white
                  transition-all hover:scale-105 active:scale-95
                  flex items-center justify-center
                "
                title="Help & Keyboard Shortcuts"
              >
                <span>❓</span>
              </button>

              {/* Keyboard Shortcuts Hint Dropdown */}
              {showKeyboardHints && !onHelp && (
                <div
                  className="
                    absolute top-full right-0 mt-2 w-64
                    bg-slate-800 border border-white/10
                    rounded-xl shadow-2xl shadow-black/40
                    p-4 z-50
                    animate-in fade-in slide-in-from-top-2 duration-200
                  "
                >
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <span aria-hidden="true">⌨️</span>
                    Keyboard Shortcuts
                  </h4>
                  <div className="space-y-2 text-xs">
                    {KEYBOARD_SHORTCUTS.map((shortcut) => (
                      <div key={shortcut.keys} className="flex items-center justify-between">
                        <span className="text-slate-400">{shortcut.action}</span>
                        <kbd className="px-2 py-1 rounded bg-slate-700 text-white font-mono">
                          {shortcut.keys}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ============================================
              MOBILE MENU BUTTON
          ============================================ */}
          <button
            onClick={() => setShowMobileMenu(true)}
            className="
              md:hidden w-10 h-10 rounded-lg
              bg-slate-800 hover:bg-slate-700
              border border-white/10
              text-white
              transition-all
              flex items-center justify-center
            "
            title="Menu"
          >
            <span className="text-xl">☰</span>
          </button>
        </div>
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
        onPlanApp={onPlanApp}
        onWizard={onWizard}
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
      />
    </>
  );
}

export default BuilderHeader;
