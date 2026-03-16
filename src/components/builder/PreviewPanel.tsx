'use client';

import { useState, useMemo, useEffect } from 'react';
import { useBuilder } from '@/contexts/BuilderContext';
import { PreviewToolbar } from './PreviewToolbar';
import { BrowserPreview } from '@/components/preview/BrowserPreview';
import { FileTree } from '@/components/ui/FileTree';
import { LoaderIcon } from '@/components/ui/Icons';
import type { GeneratedComponent } from '@/types/aiBuilderTypes';
import type { AppFile } from '@/types/railway';

// ============================================================================
// HELPERS
// ============================================================================

interface ParsedApp {
  files: AppFile[];
  dependencies: Record<string, string>;
}

function parseComponent(component: GeneratedComponent | null): ParsedApp | null {
  if (!component?.code) return null;
  try {
    const parsed = JSON.parse(component.code);
    const files = (parsed?.files as AppFile[]) ?? [];
    if (files.length === 0) return null;
    return {
      files,
      dependencies: (parsed?.dependencies as Record<string, string>) ?? {},
    };
  } catch {
    return null;
  }
}

// ============================================================================
// LIVE PREVIEW
// ============================================================================

function LivePreview({ component }: { component: GeneratedComponent | null }) {
  const parsed = useMemo(() => parseComponent(component), [component]);

  if (!component) {
    return <EmptyState message="Build an app to see the live preview" />;
  }

  if (!parsed) {
    return <EmptyState message="No previewable files found" />;
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <BrowserPreview files={parsed.files} onReady={() => {}} onError={() => {}} />
    </div>
  );
}

// ============================================================================
// CODE VIEW
// ============================================================================

function CodeView({ component }: { component: GeneratedComponent | null }) {
  const parsed = useMemo(() => parseComponent(component), [component]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Auto-select first file when component changes
  useEffect(() => {
    if (parsed?.files && parsed.files.length > 0) {
      setSelectedFile(parsed.files[0].path);
    } else {
      setSelectedFile(null);
    }
  }, [parsed]);

  if (!component || !parsed) {
    return <EmptyState message="No code to display" />;
  }

  const currentFile = parsed.files.find((f) => f.path === selectedFile);

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* File tree sidebar */}
      <div
        style={{
          width: '220px',
          minWidth: '220px',
          borderRight: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
          overflowY: 'auto',
        }}
      >
        <FileTree files={parsed.files} selectedPath={selectedFile} onSelectFile={setSelectedFile} />
      </div>

      {/* Code viewer */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          background: 'var(--bg-primary)',
        }}
      >
        {currentFile ? (
          <div style={{ padding: '12px' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-muted)',
                marginBottom: '8px',
                padding: '4px 8px',
                borderRadius: '4px',
                background: 'var(--bg-tertiary)',
                display: 'inline-block',
              }}
            >
              {currentFile.path}
            </div>
            <pre
              style={{
                margin: 0,
                padding: '16px',
                fontSize: '13px',
                lineHeight: '1.6',
                fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
                color: 'var(--text-primary)',
                background: 'var(--bg-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              <code>{currentFile.content}</code>
            </pre>
          </div>
        ) : (
          <EmptyState message="Select a file to view" />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '12px',
      }}
    >
      <LoaderIcon size={24} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{message}</p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PreviewPanel() {
  const { activeTab, currentComponent } = useBuilder();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-primary)',
      }}
    >
      <PreviewToolbar />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'preview' ? (
          <LivePreview component={currentComponent} />
        ) : (
          <CodeView component={currentComponent} />
        )}
      </div>
    </div>
  );
}
