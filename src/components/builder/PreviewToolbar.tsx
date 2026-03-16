'use client';

import { useCallback } from 'react';
import { useBuilder } from '@/contexts/BuilderContext';
import { useToast } from '@/components/Toast';
import {
  UndoIcon,
  RedoIcon,
  DownloadIcon,
  ExportIcon,
  RocketIcon,
  EyeIcon,
  CodeIcon,
} from '@/components/ui/Icons';

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px',
        fontSize: '13px',
        fontWeight: 500,
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        background: active ? 'var(--accent-primary, #22c55e)' : 'transparent',
        color: active ? '#fff' : 'var(--text-muted)',
      }}
    >
      {children}
    </button>
  );
}

function ActionButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px',
        borderRadius: '6px',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-tertiary)',
        color: disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.15s ease',
      }}
    >
      {children}
    </button>
  );
}

export function PreviewToolbar() {
  const {
    activeTab,
    setActiveTab,
    canUndo,
    canRedo,
    undo,
    redo,
    downloadCode,
    deployApp,
    openModal,
    currentComponent,
  } = useBuilder();
  const { showToast } = useToast();

  const handleUndo = useCallback(() => {
    undo();
    showToast('info', 'Change undone');
  }, [undo, showToast]);

  const handleRedo = useCallback(() => {
    redo();
    showToast('info', 'Change reapplied');
  }, [redo, showToast]);

  const handleDownload = useCallback(() => {
    if (!currentComponent) {
      showToast('warning', 'No app to download yet');
      return;
    }
    downloadCode();
    showToast('success', 'Downloading code...');
  }, [downloadCode, currentComponent, showToast]);

  const handleExport = useCallback(() => {
    if (!currentComponent) {
      showToast('warning', 'No app to export yet');
      return;
    }
    openModal('export');
  }, [openModal, currentComponent, showToast]);

  const handleDeploy = useCallback(() => {
    if (!currentComponent) {
      showToast('warning', 'No app to deploy yet');
      return;
    }
    deployApp();
    showToast('info', 'Preparing deployment...');
  }, [deployApp, currentComponent, showToast]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
      }}
    >
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <TabButton active={activeTab === 'preview'} onClick={() => setActiveTab('preview')}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <EyeIcon size={14} />
            Preview
          </span>
        </TabButton>
        <TabButton active={activeTab === 'code'} onClick={() => setActiveTab('code')}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CodeIcon size={14} />
            Code
          </span>
        </TabButton>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <ActionButton onClick={handleUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <UndoIcon size={16} />
        </ActionButton>
        <ActionButton onClick={handleRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          <RedoIcon size={16} />
        </ActionButton>

        <div
          style={{
            width: '1px',
            height: '20px',
            background: 'var(--border-color)',
            margin: '0 4px',
          }}
        />

        <ActionButton onClick={handleDownload} disabled={false} title="Download code">
          <DownloadIcon size={16} />
        </ActionButton>
        <ActionButton onClick={handleExport} disabled={false} title="Export">
          <ExportIcon size={16} />
        </ActionButton>
        <ActionButton onClick={handleDeploy} disabled={false} title="Deploy">
          <RocketIcon size={16} />
        </ActionButton>
      </div>
    </div>
  );
}
