"use client";

import React, { useState, useMemo } from 'react';
import PowerfulPreview from './PowerfulPreview';

interface AppFile {
  path: string;
  content: string;
  description: string;
}

interface FullAppData {
  name: string;
  description: string;
  appType?: 'FRONTEND_ONLY' | 'FULL_STACK';
  files: AppFile[];
  dependencies: Record<string, string>;
  setupInstructions: string;
}

interface FullAppPreviewProps {
  appDataJson: string;
}

export default function FullAppPreview({ appDataJson }: FullAppPreviewProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Memoize parsed app data
  const appData = useMemo(() => {
    try {
      return JSON.parse(appDataJson) as FullAppData;
    } catch (error) {
      console.error('Parse error:', error);
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

  // Set initial selected file
  if (!selectedFile && appData.files && appData.files.length > 0) {
    setSelectedFile(appData.files[0].path);
  }

  const currentFile = appData.files?.find(f => f.path === selectedFile);

  return (
    <div className={`flex flex-col bg-slate-900 rounded-lg border border-white/10 overflow-hidden ${
      isFullscreen 
        ? 'fixed inset-0 z-50 rounded-none h-screen' 
        : 'h-full'
    }`}>
      {/* Header with tabs */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/30 border-b border-white/10">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'preview'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            👁️ Live Preview
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'code'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            💻 Code
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span>Fully Interactive</span>
          </div>
          
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all flex items-center gap-2"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? (
              <>
                <span className="text-lg">⤓</span>
                <span className="text-sm font-medium">Exit</span>
              </>
            ) : (
              <>
                <span className="text-lg">⤢</span>
                <span className="text-sm font-medium">Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'preview' ? (
          <div className="h-full w-full">
            <PowerfulPreview appDataJson={appDataJson} />
          </div>
        ) : (
          <div className="h-full flex">
            {/* File list */}
            <div className="w-64 bg-black/20 border-r border-white/10 overflow-y-auto">
              <div className="p-3 border-b border-white/10">
                <h3 className="text-xs font-semibold text-slate-400 uppercase">Files</h3>
              </div>
              {appData.files.map((file) => (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file.path)}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    selectedFile === file.path
                      ? 'bg-blue-600/20 text-blue-300 border-l-2 border-blue-500'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">
                      {file.path.endsWith('.tsx') || file.path.endsWith('.ts')
                        ? '📘'
                        : file.path.endsWith('.css')
                        ? '🎨'
                        : file.path.endsWith('.json')
                        ? '⚙️'
                        : '📄'}
                    </span>
                    <span className="truncate">{file.path}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Code viewer */}
            <div className="flex-1 overflow-auto">
              {currentFile ? (
                <div className="h-full">
                  <div className="sticky top-0 bg-black/40 backdrop-blur-sm px-4 py-2 border-b border-white/10 flex items-center justify-between">
                    <span className="text-sm text-slate-300 font-mono">{currentFile.path}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(currentFile.content);
                      }}
                      className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <pre className="p-4 text-sm text-slate-300 font-mono overflow-x-auto">
                    <code>{currentFile.content}</code>
                  </pre>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">
                  Select a file to view its contents
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
