'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getWebContainerService } from '@/services/WebContainerService';
import { useBrowserSupport } from '@/hooks/useBrowserSupport';
import { WebContainerTerminal } from './WebContainerTerminal';

// ============================================================================
// TYPES
// ============================================================================

interface AppFile {
  path: string;
  content: string;
}

interface WebContainerPreviewProps {
  files: AppFile[];
  dependencies?: Record<string, string>;
  devCommand?: string;
  showTerminal?: boolean;
  onReady?: (url: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}

type PreviewStatus = 'checking' | 'booting' | 'installing' | 'starting' | 'ready' | 'error';

// ============================================================================
// DEFAULT PACKAGE.JSON TEMPLATE
// ============================================================================

function generatePackageJson(dependencies: Record<string, string>, devCommand: string): string {
  const packageJson = {
    name: 'preview-app',
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: devCommand === 'npm run dev' ? 'vite' : devCommand.replace('npm run ', ''),
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0',
      ...dependencies,
    },
    devDependencies: {
      '@vitejs/plugin-react': '^4.2.0',
      vite: '^5.0.0',
    },
  };
  return JSON.stringify(packageJson, null, 2);
}

// ============================================================================
// DEFAULT VITE CONFIG
// ============================================================================

const VITE_CONFIG = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
});
`;

// ============================================================================
// DEFAULT INDEX.HTML
// ============================================================================

const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

// ============================================================================
// DEFAULT MAIN.TSX
// ============================================================================

const MAIN_TSX = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

// ============================================================================
// COMPONENT
// ============================================================================

export function WebContainerPreview({
  files,
  dependencies = {},
  devCommand = 'npm run dev',
  showTerminal = true,
  onReady,
  onError,
  className = '',
}: WebContainerPreviewProps) {
  const { supportsWebContainers, browserName, reason } = useBrowserSupport();
  const [status, setStatus] = useState<PreviewStatus>('checking');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [showTerminalPanel, setShowTerminalPanel] = useState(showTerminal);
  const mountedRef = useRef(true);

  // Append to terminal output
  const appendOutput = useCallback((data: string) => {
    if (!mountedRef.current) return;
    // Split by newlines and add each line
    const lines = data.split('\n').filter((line) => line.trim());
    setTerminalOutput((prev) => [...prev, ...lines]);
  }, []);

  // Initialize WebContainer and run app
  useEffect(() => {
    mountedRef.current = true;

    if (!supportsWebContainers) {
      setStatus('error');
      setError(new Error(reason || 'WebContainers not supported'));
      return;
    }

    const service = getWebContainerService();

    // Set up event handlers
    service.setEventHandlers({
      onBoot: () => {
        if (mountedRef.current) {
          setStatus('booting');
          appendOutput('Booting WebContainer...');
        }
      },
      onOutput: appendOutput,
      onServerReady: (port, url) => {
        if (mountedRef.current) {
          appendOutput(`Server ready on port ${port}`);
          setPreviewUrl(url);
          setStatus('ready');
          onReady?.(url);
        }
      },
      onError: (err) => {
        if (mountedRef.current) {
          setError(err);
          setStatus('error');
          onError?.(err);
        }
      },
    });

    // Boot and run
    (async () => {
      try {
        // Boot container
        await service.boot();
        if (!mountedRef.current) return;

        // Prepare files with required boilerplate
        const allFiles = prepareFiles(files, dependencies, devCommand);

        // Mount files
        appendOutput('Mounting files...');
        await service.mountFiles(allFiles);
        if (!mountedRef.current) return;

        // Install dependencies
        setStatus('installing');
        appendOutput('Installing dependencies (this may take a minute)...');
        await service.installDependencies();
        if (!mountedRef.current) return;

        // Start dev server
        setStatus('starting');
        appendOutput('Starting development server...');
        await service.startDevServer(devCommand);
        // Status will be set to 'ready' by onServerReady handler
      } catch (err) {
        if (mountedRef.current) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          setStatus('error');
          appendOutput(`Error: ${error.message}`);
          onError?.(error);
        }
      }
    })();

    return () => {
      mountedRef.current = false;
      // Note: We don't teardown here because other components might use the container
      // Teardown should be called explicitly when completely done with preview
    };
  }, [
    supportsWebContainers,
    reason,
    files,
    dependencies,
    devCommand,
    appendOutput,
    onReady,
    onError,
  ]);

  // Prepare files with boilerplate
  function prepareFiles(appFiles: AppFile[], deps: Record<string, string>, cmd: string): AppFile[] {
    const result: AppFile[] = [];

    // Check if files already include these
    const hasPackageJson = appFiles.some((f) => f.path === 'package.json');
    const hasViteConfig = appFiles.some(
      (f) => f.path === 'vite.config.ts' || f.path === 'vite.config.js'
    );
    const hasIndexHtml = appFiles.some((f) => f.path === 'index.html');
    const hasMain = appFiles.some((f) => f.path === 'src/main.tsx' || f.path === 'main.tsx');

    // Add boilerplate if missing
    if (!hasPackageJson) {
      result.push({ path: 'package.json', content: generatePackageJson(deps, cmd) });
    }
    if (!hasViteConfig) {
      result.push({ path: 'vite.config.ts', content: VITE_CONFIG });
    }
    if (!hasIndexHtml) {
      result.push({ path: 'index.html', content: INDEX_HTML });
    }
    if (!hasMain) {
      result.push({ path: 'src/main.tsx', content: MAIN_TSX });
    }

    // Add app files (normalize paths to src/)
    for (const file of appFiles) {
      let path = file.path;
      // Don't modify root-level config files
      if (
        path === 'package.json' ||
        path === 'vite.config.ts' ||
        path === 'vite.config.js' ||
        path === 'index.html'
      ) {
        result.push(file);
        continue;
      }
      // Ensure app code is in src/
      if (!path.startsWith('src/') && !path.startsWith('/')) {
        path = `src/${path}`;
      }
      result.push({ path, content: file.content });
    }

    return result;
  }

  // Render browser not supported
  if (!supportsWebContainers) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-8 bg-zinc-800 rounded-lg ${className}`}
      >
        <div className="text-yellow-400 text-lg font-medium mb-2">WebContainers Not Supported</div>
        <div className="text-zinc-400 text-sm text-center max-w-md">
          Your browser ({browserName}) does not support WebContainers.
          {reason && <span className="block mt-1">{reason}</span>}
        </div>
        <div className="text-zinc-500 text-xs mt-4">
          Try using Chrome or Firefox for full-stack preview support.
        </div>
      </div>
    );
  }

  // Render error state
  if (status === 'error' && error) {
    return (
      <div className={`flex flex-col ${className}`}>
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-800 rounded-lg flex-1">
          <div className="text-red-400 text-lg font-medium mb-2">Preview Error</div>
          <div className="text-zinc-400 text-sm text-center max-w-md">{error.message}</div>
        </div>
        {showTerminal && (
          <div className="h-32 mt-2">
            <WebContainerTerminal output={terminalOutput} className="h-full rounded-lg" />
          </div>
        )}
      </div>
    );
  }

  // Render loading states
  if (status !== 'ready') {
    return (
      <div className={`flex flex-col ${className}`}>
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-800 rounded-lg flex-1">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <div className="text-zinc-300 text-sm">
            {status === 'checking' && 'Checking browser support...'}
            {status === 'booting' && 'Booting WebContainer...'}
            {status === 'installing' && 'Installing dependencies...'}
            {status === 'starting' && 'Starting dev server...'}
          </div>
          <div className="text-zinc-500 text-xs mt-2">
            {status === 'installing' && 'This may take up to a minute'}
          </div>
        </div>
        {showTerminal && (
          <div className="h-32 mt-2">
            <WebContainerTerminal output={terminalOutput} className="h-full rounded-lg" />
          </div>
        )}
      </div>
    );
  }

  // Render preview iframe
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex-1 relative bg-white rounded-lg overflow-hidden">
        {previewUrl && (
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title="WebContainer Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        )}
      </div>
      {showTerminalPanel && (
        <div className="relative">
          <button
            onClick={() => setShowTerminalPanel(false)}
            className="absolute top-1 right-1 z-10 text-zinc-400 hover:text-zinc-200 text-xs px-2 py-0.5 bg-zinc-800 rounded"
          >
            Hide
          </button>
          <div className="h-32 mt-2">
            <WebContainerTerminal output={terminalOutput} className="h-full rounded-lg" />
          </div>
        </div>
      )}
      {!showTerminalPanel && (
        <button
          onClick={() => setShowTerminalPanel(true)}
          className="mt-2 text-zinc-400 hover:text-zinc-200 text-xs py-1"
        >
          Show Terminal
        </button>
      )}
    </div>
  );
}

export default WebContainerPreview;
