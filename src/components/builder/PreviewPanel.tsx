'use client';

import { useState, useMemo, useEffect, Component, type ReactNode, type ErrorInfo } from 'react';
import { SandpackProvider, SandpackPreview } from '@codesandbox/sandpack-react';
import { useBuilder } from '@/contexts/BuilderContext';
import { PreviewToolbar } from './PreviewToolbar';
import { FileTree } from '@/components/ui/FileTree';
import { LoaderIcon } from '@/components/ui/Icons';
import type { GeneratedComponent } from '@/types/aiBuilderTypes';
import type { AppFile } from '@/types/railway';

// ============================================================================
// SANDPACK CONFIG (mirrors LayoutCanvas patterns)
// ============================================================================

const SANDPACK_DEPENDENCIES: Record<string, string> = {
  'framer-motion': 'latest',
  'lucide-react': 'latest',
  'react-router-dom': 'latest',
  clsx: 'latest',
  'tailwind-merge': 'latest',
};

const TAILWIND_CDN = 'https://cdn.tailwindcss.com';

const DEFAULT_ENTRY_CODE = [
  "import React from 'react';",
  "import { createRoot } from 'react-dom/client';",
  "import App from './App';",
  '',
  "const root = createRoot(document.getElementById('root')!);",
  'root.render(',
  '  <React.StrictMode>',
  '    <App />',
  '  </React.StrictMode>',
  ');',
].join('\n');

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

/**
 * Converts AppFile[] to Sandpack's files format.
 * Strips /src/ prefix for react-ts template compatibility.
 * Ensures an entry file exists.
 */
function toSandpackFiles(files: AppFile[]): Record<string, { code: string; hidden?: boolean }> {
  const result: Record<string, { code: string; hidden?: boolean }> = {};
  let hasEntryFile = false;

  for (const file of files) {
    let path = file.path;
    if (path.startsWith('/src/')) {
      path = '/' + path.slice(5);
    }
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    result[path] = { code: file.content };

    if (path === '/index.tsx' || path === '/index.ts') {
      hasEntryFile = true;
    }
  }

  if (!hasEntryFile) {
    result['/index.tsx'] = { code: DEFAULT_ENTRY_CODE };
  }

  // Ensure /App.tsx exists — Sandpack's react-ts template provides a default "Hello world"
  // App if we don't override it. Check common paths where the app component might live.
  if (!result['/App.tsx'] && !result['/App.ts'] && !result['/App.jsx']) {
    const appPaths = ['/components/App.tsx', '/components/App.jsx', '/components/app.tsx'];
    for (const p of appPaths) {
      if (result[p]) {
        result['/App.tsx'] = result[p];
        break;
      }
    }

    // If still no App.tsx, find the best candidate .tsx file and re-export it
    if (!result['/App.tsx']) {
      const candidates = Object.entries(result)
        .filter(
          ([path]) =>
            path.endsWith('.tsx') &&
            !path.includes('index') &&
            !path.includes('ErrorBoundary') &&
            !path.includes('preflight')
        )
        .sort((a, b) => b[1].code.length - a[1].code.length);

      if (candidates.length > 0) {
        const [bestPath] = candidates[0];
        result['/App.tsx'] = {
          code: `export { default } from '${bestPath.replace(/\.(tsx|jsx|ts|js)$/, '')}';`,
        };
      }
    }
  }

  // If the entry file imports preflight-undo or inspector (from LayoutCanvas)
  // but those support files aren't in the bundle, replace with clean entry
  const entryPath = result['/index.tsx'] ? '/index.tsx' : result['/index.ts'] ? '/index.ts' : null;
  if (entryPath) {
    const entryCode = result[entryPath]?.code ?? '';
    const needsPreflight =
      entryCode.includes('preflight-undo') &&
      !result['/preflight-undo.ts'] &&
      !result['/preflight-undo.js'];
    const needsInspector =
      entryCode.includes('./inspector') && !result['/inspector.ts'] && !result['/inspector.js'];
    if (needsPreflight || needsInspector) {
      result[entryPath] = { code: DEFAULT_ENTRY_CODE };
    }
  }

  return result;
}

// ============================================================================
// ERROR BOUNDARY (prevents Sandpack crashes from killing the whole panel)
// ============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class SandpackErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Error already captured in getDerivedStateFromError
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '12px',
            padding: '24px',
          }}
        >
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Preview crashed. Try rebuilding.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '6px 14px',
              fontSize: '13px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================================
// LIVE PREVIEW (Sandpack + Nodebox)
// ============================================================================

function LivePreview({ component }: { component: GeneratedComponent | null }) {
  const parsed = useMemo(() => parseComponent(component), [component]);

  const sandpackFiles = useMemo(() => {
    if (!parsed) return null;
    return toSandpackFiles(parsed.files);
  }, [parsed]);

  const mergedDeps = useMemo(() => {
    if (!parsed) return SANDPACK_DEPENDENCIES;
    return { ...SANDPACK_DEPENDENCIES, ...parsed.dependencies };
  }, [parsed]);

  if (!component) {
    return <EmptyState message="Build an app to see the live preview" />;
  }

  if (!sandpackFiles) {
    return <EmptyState message="No previewable files found" />;
  }

  return (
    <div className="builder-sandpack-preview" style={{ width: '100%', height: '100%' }}>
      <SandpackErrorBoundary>
        <SandpackProvider
          template="react-ts"
          files={sandpackFiles}
          customSetup={{
            dependencies: mergedDeps,
          }}
          options={{
            externalResources: [TAILWIND_CDN],
            classes: {
              'sp-wrapper': 'h-full w-full flex flex-col',
              'sp-layout': 'h-full w-full flex flex-col',
              'sp-stack': 'h-full w-full flex-1',
            },
          }}
        >
          <SandpackPreview
            showNavigator={false}
            showRefreshButton={false}
            style={{ height: '100%', width: '100%' }}
          />
        </SandpackProvider>
      </SandpackErrorBoundary>
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
