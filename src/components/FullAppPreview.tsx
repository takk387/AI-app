"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';

interface AppFile {
  path: string;
  content: string;
  description: string;
}

interface FullAppData {
  name: string;
  description: string;
  appType?: 'FRONTEND_ONLY' | 'FULL_STACK'; // New field
  files: AppFile[];
  dependencies: Record<string, string>;
  setupInstructions: string;
}

interface FullAppPreviewProps {
  appDataJson: string;
}

export default function FullAppPreview({ appDataJson }: FullAppPreviewProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0); // Force iframe remount
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Memoize parsed app data to prevent unnecessary re-renders
  const appData = useMemo(() => {
    try {
      const parsed = JSON.parse(appDataJson);
      console.log('FullAppPreview - Parsed app data:', {
        name: parsed.name,
        filesCount: parsed.files?.length,
        files: parsed.files?.map((f: AppFile) => f.path)
      });
      return parsed;
    } catch (error) {
      console.error('FullAppPreview - Parse error:', error);
      return null;
    }
  }, [appDataJson]);

  // Handle parse error
  if (!appData) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
        <p className="text-red-400">Error parsing app data</p>
      </div>
    );
  }

  // Update iframe when app data changes
  useEffect(() => {
    if (!appData.files) {
      console.log('FullAppPreview - Missing files');
      return;
    }

    // Debounce iframe updates to prevent rapid recreation
    const timeoutId = setTimeout(() => {
      setIsLoading(true);

      try {
        // Find the main App file (or page.tsx for full-stack Next.js apps)
        const appFile = appData.files.find(f => 
          f.path === 'src/App.tsx' || 
          f.path === 'App.tsx' ||
          f.path === 'app/page.tsx' ||
          f.path === 'page.tsx' ||
          f.path.endsWith('/App.tsx') ||
          f.path.endsWith('/page.tsx')
        );
        
        console.log('FullAppPreview - Found app file:', appFile?.path);
        
        if (!appFile) {
          setSandboxError('No App.tsx or page.tsx found in generated files');
          setIsLoading(false);
          return;
        }

        // For full-stack apps, show a warning but still try to preview
        if (appData.appType === 'FULL_STACK') {
          setSandboxError('⚠️ Preview mode: Backend features (database, auth, APIs) will not work. Download and run locally for full functionality.');
        } else {
          setSandboxError(null);
        }

        // Extract just the App component code
        let appCode = appFile.content;
        
        console.log('FullAppPreview - Original code length:', appCode.length);
        console.log('FullAppPreview - Code preview:', appCode.substring(0, 200));
        
        // Remove all imports (we'll provide React globally)
        appCode = appCode
          .replace(/import\s+.*?from\s+['"][^'"]+['"];?\n?/g, '')
          .replace(/import\s+type\s+{[^}]+}\s+from\s+[^;]+;?\n?/g, '');

        console.log('FullAppPreview - After removing imports:', appCode.substring(0, 200));

        // Replace Next.js-specific components with standard HTML
        // More robust Link replacement - handle all variations
        appCode = appCode
          // Replace opening Link tags with all possible attributes
          .replace(/<Link(\s+[^>]*)>/gi, '<a$1>')
          // Replace self-closing Link tags
          .replace(/<Link(\s+[^>]*)\/>/gi, '<a$1/>')
          // Replace closing Link tags
          .replace(/<\/Link>/gi, '</a>')
          // Replace Image component
          .replace(/<Image(\s+[^>]*)>/gi, '<img$1>')
          .replace(/<Image(\s+[^>]*)\/>/gi, '<img$1/>')
          .replace(/<\/Image>/gi, '</img>')
          // Remove any remaining next/link or next/image references
          .replace(/next\/link/g, '')
          .replace(/next\/image/g, '');

        console.log('FullAppPreview - After replacing Next.js components:', appCode.substring(0, 200));

        // Create the sandbox HTML
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>App Preview</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    #root { width: 100%; min-height: 100vh; }
  </style>
</head>
<body>
  <div id="root">Loading...</div>
  
  <script>
    console.log('Sandbox starting...');
    
    // Provide global React hooks
    window.React = React;
    window.useState = React.useState;
    window.useEffect = React.useEffect;
    window.useRef = React.useRef;
    window.useCallback = React.useCallback;
    window.useMemo = React.useMemo;
    window.useReducer = React.useReducer;
    window.useContext = React.useContext;
    window.createContext = React.createContext;
    
    window.onerror = function(msg, url, line, col, error) {
      console.error('Sandbox error:', msg, error);
      document.getElementById('root').innerHTML = 
        '<div style="padding: 20px; color: #dc2626;">' +
        '<h3>Preview Error</h3>' +
        '<p style="margin-top: 8px;">Error: ' + msg + '</p>' +
        '</div>';
      return false;
    };
  </script>
  
  <script type="text/babel" data-type="module">
    console.log('Babel script executing...');
    const { useState, useEffect, useRef, useCallback, useMemo, useReducer, useContext, createContext } = React;
    
    ${appCode.replace(/export default/g, 'window.App =')}
    
    // Render
    console.log('About to render App...');
    try {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(window.App));
      console.log('App rendered successfully!');
    } catch (error) {
      console.error('Render error:', error);
      document.getElementById('root').innerHTML = 
        '<div style="padding: 20px; color: #dc2626;">' +
        '<h3>Preview Error</h3>' +
        '<p style="margin-top: 8px; color: #666;">Failed to render: ' + error.message + '</p>' +
        '<p style="margin-top: 12px; font-size: 14px; color: #999;">Try asking the AI to fix the code.</p>' +
        '</div>';
    }
  </script>
</body>
</html>
        `;
        
        console.log('FullAppPreview - Generated HTML length:', html.length);
        
        // Force iframe remount by updating key - this completely avoids removeChild issues
        setIframeKey(prev => prev + 1);
        
        // Wait for iframe to mount, then set content
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (iframeRef.current) {
              iframeRef.current.srcdoc = html;
              setTimeout(() => setIsLoading(false), 500);
            }
          });
        });
        
      } catch (error) {
        console.error('FullAppPreview - Error in useEffect:', error);
        setSandboxError(error instanceof Error ? error.message : 'Unknown error');
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    // Cleanup function to cancel pending updates
    return () => {
      clearTimeout(timeoutId);
    };
  }, [appDataJson]); // Only depend on the JSON string, not parsed appData

  // Set initial selected file
  useEffect(() => {
    if (appData.files && appData.files.length > 0 && !selectedFile) {
      setSelectedFile(appData.files[0].path);
    }
  }, [appData.files, selectedFile]);

  const currentFile = appData.files?.find(f => f.path === selectedFile);

  // Helper to create sandbox HTML
  const createSandboxHTML = (appCode: string) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>App Preview</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    #root { width: 100%; min-height: 100vh; }
  </style>
</head>
<body>
  <div id="root">Loading...</div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useCallback, useMemo, useReducer, useContext } = React;
    ${appCode}
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>`;
  };

  // Copy file content to clipboard
  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  // Download all files
  const downloadAll = () => {
    const filesText = appData.files.map(file => 
      `// ${file.path}\n${'='.repeat(50)}\n${file.content}\n\n`
    ).join('\n');
    
    const blob = new Blob([filesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${appData.name.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* App Info Header */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-bold text-white">🚀 {appData.name}</h2>
              {appData.appType === 'FULL_STACK' && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-medium">
                  ⚡ Full-Stack
                </span>
              )}
            </div>
            <p className="text-sm text-slate-300 mb-3">{appData.description}</p>
            <div className="flex gap-2 text-xs text-slate-400">
              <span>📁 {appData.files?.length || 0} files</span>
              <span>•</span>
              <span>📦 {Object.keys(appData.dependencies || {}).length} dependencies</span>
              {appData.appType === 'FULL_STACK' && (
                <>
                  <span>•</span>
                  <span className="text-purple-400">🔧 Requires local dev server</span>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCode(!showCode)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all"
            >
              {showCode ? '�️ Preview' : '💻 Code'}
            </button>
            <button
              onClick={downloadAll}
              className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-all"
            >
              📥 Download
            </button>
          </div>
        </div>
      </div>

      {sandboxError && (
        <div className={`p-4 rounded-xl border ${
          appData.appType === 'FULL_STACK' 
            ? 'bg-purple-500/10 border-purple-500/20' 
            : 'bg-red-500/10 border-red-500/20'
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">{appData.appType === 'FULL_STACK' ? '🔧' : '⚠️'}</span>
            <div>
              <p className={`font-medium text-sm mb-1 ${
                appData.appType === 'FULL_STACK' ? 'text-purple-300' : 'text-red-400'
              }`}>
                {appData.appType === 'FULL_STACK' ? 'Backend Required' : 'Preview Error'}
              </p>
              <p className={`text-sm ${
                appData.appType === 'FULL_STACK' ? 'text-purple-200' : 'text-red-300'
              }`}>
                {sandboxError}
              </p>
              {appData.appType === 'FULL_STACK' && (
                <div className="mt-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <p className="text-xs font-medium text-purple-300 mb-2">📋 Quick Setup:</p>
                  <ol className="text-xs text-purple-200 space-y-1 list-decimal list-inside">
                    <li>Download the code using the button above</li>
                    <li>Extract files to a new project folder</li>
                    <li>Follow the setup instructions in the Setup tab</li>
                    <li>Run <code className="px-1 py-0.5 rounded bg-purple-500/20">npm run dev</code></li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Code View - File Browser */}
      {showCode ? (
        <div className="grid grid-cols-12 gap-4 min-h-[500px]">
          {/* File Tree - Left Sidebar */}
          <div className="col-span-3 p-3 rounded-xl bg-white/5 border border-white/10">
            <h3 className="text-xs font-semibold text-slate-400 mb-3 px-2">FILES</h3>
            <div className="space-y-1">
              {appData.files?.map((file) => {
                const isSelected = selectedFile === file.path;
                const fileName = file.path.split('/').pop() || file.path;
                
                // Enhanced file icons for full-stack files
                const fileIcon = 
                  file.path.includes('/api/') ? '🔌' : // API routes
                  file.path.endsWith('.prisma') ? '🗄️' : // Database schema
                  file.path.includes('middleware') ? '�️' : // Middleware
                  file.path === '.env.example' || file.path.endsWith('.env') ? '🔐' : // Env files
                  file.path.endsWith('.tsx') || file.path.endsWith('.ts') ? '📘' : // TypeScript
                  file.path.endsWith('.css') ? '🎨' : // CSS
                  file.path.endsWith('.json') ? '📋' : // JSON
                  file.path.endsWith('.md') ? '�' : // Markdown
                  '📄'; // Default

                return (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFile(file.path)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all text-xs ${
                      isSelected
                        ? 'bg-blue-600 text-white font-medium'
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{fileIcon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{fileName}</div>
                        <div className="truncate text-[10px] opacity-60">{file.path}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* File Content - Right Panel */}
          <div className="col-span-9 p-4 rounded-xl bg-white/5 border border-white/10">
            {currentFile ? (
              <div>
                {/* File Header */}
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{currentFile.path}</h3>
                    <p className="text-xs text-slate-400 mt-1">{currentFile.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(currentFile.content)}
                      className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition-all flex items-center gap-2"
                    >
                      <span>📋</span>
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                {/* View Mode */}
                <div className="relative">
                  <pre className="bg-slate-900 rounded-lg p-4 overflow-x-auto text-xs font-mono text-slate-300 max-h-[500px] overflow-y-auto">
                    <code>{currentFile.content}</code>
                  </pre>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">📁</div>
                  <p className="text-sm">Select a file to view</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Live Preview - Sandbox */
        <div className="rounded-xl bg-white border border-white/10 overflow-hidden relative" style={{ height: '600px' }}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center">
                <div className="animate-spin text-4xl mb-2">⚙️</div>
                <p className="text-slate-600">Loading preview...</p>
              </div>
            </div>
          )}
          <iframe
            key={iframeKey}
            ref={iframeRef}
            className="w-full h-full"
            sandbox="allow-scripts allow-same-origin"
            title="App Preview"
          />
        </div>
      )}
    </div>
  );
}
