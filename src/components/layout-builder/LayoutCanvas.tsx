/**
 * Layout Canvas (Sandpack Preview)
 *
 * Renders generated code in an interactive preview via Sandpack.
 * The inspector bridge enables click-to-select on [data-id] elements.
 * FloatingEditBubble appears for inline editing of selected components.
 *
 * This component replaces the old DynamicLayoutRenderer with code-generation
 * based preview. The existing BrowserPreview + esbuild-wasm (for the main
 * app builder) is untouched.
 */

import React, { useRef, useState, useCallback, useMemo } from 'react';
import { SandpackProvider, SandpackPreview } from '@codesandbox/sandpack-react';
import { FloatingEditBubble } from './FloatingEditBubble';
import { useInspectorBridge, createInspectorFileContent } from '@/utils/inspectorBridge';
import type { AppFile } from '@/types/railway';
import type { PipelineProgress, PipelineStepName } from '@/types/titanPipeline';
import { PIPELINE_STEP_LABELS } from '@/types/titanPipeline';

// ============================================================================
// SANDPACK CONFIGURATION
// ============================================================================

/** Dependencies pre-loaded in Sandpack for generated code */
const SANDPACK_DEPENDENCIES: Record<string, string> = {
  'framer-motion': 'latest',
  'lucide-react': 'latest',
  clsx: 'latest',
  'tailwind-merge': 'latest',
};

/** Tailwind CSS CDN for external resource injection */
const TAILWIND_CDN = 'https://cdn.tailwindcss.com';

/** Default entry file when Builder doesn't output one */
const DEFAULT_ENTRY_CODE = [
  "import React from 'react';",
  "import { createRoot } from 'react-dom/client';",
  "import App from './App';",
  "import './inspector';",
  '',
  "const root = createRoot(document.getElementById('root')!);",
  'root.render(',
  '  <React.StrictMode>',
  '    <App />',
  '  </React.StrictMode>',
  ');',
].join('\n');

// ============================================================================
// PROPS
// ============================================================================

export interface LayoutCanvasProps {
  /** Generated code files from the pipeline */
  generatedFiles: AppFile[];
  /** Whether the pipeline is currently running */
  isProcessing: boolean;
  /** Pipeline progress state */
  pipelineProgress?: PipelineProgress | null;
  /** Errors from pipeline or analysis */
  errors?: string[];
  /** Non-fatal warnings */
  warnings?: string[];
  /** Called when user drops files on the canvas */
  onDropFiles: (files: File[]) => void;
  /** Called when a component edit is submitted via FloatingEditBubble */
  onRefineComponent: (dataId: string, prompt: string, outerHTML: string) => Promise<void>;
  /** Undo last change */
  onUndo: () => void;
  /** Redo last undone change */
  onRedo: () => void;
  /** Export generated code */
  onExportCode: () => void;
  /** Clear error/warning display */
  onClearErrors?: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Converts AppFile[] from the pipeline into Sandpack's files format.
 * Also injects the inspector script and ensures a valid entry file exists.
 *
 * The pipeline outputs paths like `/src/App.tsx` but Sandpack's react-ts
 * template expects `/App.tsx`. We strip the `/src/` prefix for compatibility.
 */
function toSandpackFiles(files: AppFile[]): Record<string, { code: string; hidden?: boolean }> {
  const result: Record<string, { code: string; hidden?: boolean }> = {};
  let hasEntryFile = false;

  for (const file of files) {
    // Normalize: strip /src/ prefix for Sandpack react-ts template compat
    let path = file.path;
    if (path.startsWith('/src/')) {
      path = '/' + path.slice(5);
    }
    result[path] = { code: file.content };

    if (path === '/index.tsx' || path === '/index.ts') {
      hasEntryFile = true;
    }
  }

  // Inject inspector script (self-executing IIFE, imported by entry file)
  result['/inspector.ts'] = {
    code: createInspectorFileContent(),
    hidden: true,
  };

  // Ensure entry file exists with inspector import
  if (!hasEntryFile) {
    result['/index.tsx'] = { code: DEFAULT_ENTRY_CODE };
  }

  return result;
}

/**
 * Returns the status indicator element for a pipeline step.
 */
function StepIndicator({ status }: { status: string }) {
  switch (status) {
    case 'running':
      return <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />;
    case 'complete':
      return <span className="w-2 h-2 rounded-full bg-green-600" />;
    case 'error':
      return <span className="w-2 h-2 rounded-full bg-red-600" />;
    case 'skipped':
      return <span className="w-2 h-2 rounded-full bg-gray-300" />;
    default:
      return <span className="w-2 h-2 rounded-full bg-gray-200" />;
  }
}

/**
 * Returns a Tailwind text color class for a pipeline step status.
 */
function stepTextClass(status: string): string {
  switch (status) {
    case 'running':
      return 'text-blue-800 font-medium';
    case 'complete':
      return 'text-green-700';
    case 'error':
      return 'text-red-700';
    default:
      return 'text-gray-400';
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export const LayoutCanvas: React.FC<LayoutCanvasProps> = ({
  generatedFiles,
  isProcessing,
  pipelineProgress,
  errors = [],
  warnings = [],
  onDropFiles,
  onRefineComponent,
  onUndo,
  onRedo,
  onExportCode,
  onClearErrors,
  canUndo,
  canRedo,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const inspector = useInspectorBridge();

  const hasFiles = generatedFiles.length > 0;
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  // Convert AppFile[] to Sandpack format (memoized to avoid re-renders)
  const sandpackFiles = useMemo(() => {
    if (!hasFiles) return null;
    return toSandpackFiles(generatedFiles);
  }, [generatedFiles, hasFiles]);

  // Container offset for FloatingEditBubble positioning.
  // The inspector sends rect relative to the iframe viewport.
  // Since the Sandpack preview iframe fills its container, offset is 0.
  // If Sandpack adds internal chrome (toolbars etc.), we'd need to measure
  // the actual iframe element's offset here.
  const containerOffset = useMemo(() => ({ top: 0, left: 0 }), []);

  // --- Drag Handlers ---
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onDropFiles(Array.from(e.dataTransfer.files));
      }
    },
    [onDropFiles]
  );

  // Background click deselects the inspector selection
  const handleBackgroundClick = useCallback(() => {
    inspector.clearSelection();
  }, [inspector]);

  return (
    <div className="flex flex-col h-full w-full bg-gray-50">
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="h-14 border-b bg-white flex items-center px-4 justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm text-gray-700">Preview</span>

          {/* Processing indicator */}
          {isProcessing && (
            <span className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              {pipelineProgress?.message || 'Processing...'}
            </span>
          )}

          {/* Error badge */}
          {hasErrors && !isProcessing && (
            <span className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
              {errors.length} error{errors.length > 1 ? 's' : ''}
            </span>
          )}

          {/* Warning badge */}
          {hasWarnings && !hasErrors && !isProcessing && (
            <span className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
              {warnings.length} warning{warnings.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex gap-1">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-2 rounded hover:bg-gray-100 ${
                !canUndo ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Undo"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4"
                />
              </svg>
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-2 rounded hover:bg-gray-100 ${
                !canRedo ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Redo"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 10H11a5 5 0 00-5 5v2M21 10l-4-4M21 10l-4 4"
                />
              </svg>
            </button>
          </div>

          {/* Export */}
          <button
            onClick={onExportCode}
            disabled={!hasFiles}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg disabled:opacity-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Export React
          </button>
        </div>
      </div>

      {/* ── Pipeline Step Progress ──────────────────────────────────── */}
      {isProcessing && pipelineProgress && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center gap-4">
            {(Object.entries(pipelineProgress.steps) as [PipelineStepName, string][]).map(
              ([step, status]) => (
                <div key={step} className="flex items-center gap-1.5">
                  <StepIndicator status={status} />
                  <span className={`text-xs ${stepTextClass(status)}`}>
                    {PIPELINE_STEP_LABELS[step]}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ── Error / Warning Panel ──────────────────────────────────── */}
      {(hasErrors || hasWarnings) && !isProcessing && (
        <div
          className={`px-4 py-2 border-b ${
            hasErrors ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {hasErrors && (
                <div className="mb-1">
                  <span className="font-medium text-sm text-red-800">Errors:</span>
                  <ul className="mt-1 text-xs text-red-700 list-disc list-inside">
                    {errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              {hasWarnings && (
                <div>
                  <span className="font-medium text-sm text-amber-800">Warnings:</span>
                  <ul className="mt-1 text-xs text-amber-700 list-disc list-inside">
                    {warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {onClearErrors && (
              <button
                onClick={onClearErrors}
                className={`ml-4 text-xs px-2 py-1 rounded ${
                  hasErrors ? 'text-red-700 hover:bg-red-100' : 'text-amber-700 hover:bg-amber-100'
                }`}
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Main Canvas Area ───────────────────────────────────────── */}
      <div
        className={`flex-1 overflow-hidden relative transition-colors ${
          dragActive ? 'bg-blue-50' : ''
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleBackgroundClick}
      >
        {/* Sandpack Preview (when generated code exists) */}
        {hasFiles && sandpackFiles && (
          <SandpackProvider
            template="react-ts"
            files={sandpackFiles}
            customSetup={{
              dependencies: SANDPACK_DEPENDENCIES,
            }}
            options={{
              externalResources: [TAILWIND_CDN],
              classes: {
                "sp-wrapper": "h-full w-full flex flex-col",
                "sp-layout": "h-full w-full flex flex-col",
                "sp-stack": "h-full w-full flex-1",
              },
            }}
          >
            <div
              ref={previewContainerRef}
              className="w-full h-full relative flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <SandpackPreview
                showNavigator={false}
                showRefreshButton={false}
                style={{ height: '100%', width: '100%' }}
              />

              {/* FloatingEditBubble — positioned over the selected element */}
              {inspector.selectedComponentId &&
                inspector.selectedHTML &&
                inspector.selectedTagName &&
                inspector.selectedRect && (
                  <FloatingEditBubble
                    dataId={inspector.selectedComponentId}
                    componentType={inspector.selectedTagName}
                    outerHTML={inspector.selectedHTML}
                    rect={inspector.selectedRect}
                    containerOffset={containerOffset}
                    onRefine={onRefineComponent}
                    onClose={inspector.clearSelection}
                  />
                )}
            </div>
          </SandpackProvider>
        )}

        {/* Empty State / Drop Zone */}
        {!hasFiles && !isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-8 bg-white/80 backdrop-blur rounded-xl border border-dashed border-gray-300 shadow-lg max-w-sm">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-lg font-medium text-gray-900 mb-1">Drop an Image or Video</p>
              <p className="text-sm text-gray-500">
                Or use the chat to describe what you want to build
              </p>
            </div>
          </div>
        )}

        {/* Processing State (before any files are generated) */}
        {isProcessing && !hasFiles && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="w-10 h-10 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-700">
                {pipelineProgress?.message || 'Generating layout...'}
              </p>
            </div>
          </div>
        )}

        {/* Drag Overlay */}
        {dragActive && (
          <div className="absolute inset-0 bg-blue-100/50 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center z-20 pointer-events-none">
            <p className="text-blue-700 font-medium text-sm">Drop files here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LayoutCanvas;
