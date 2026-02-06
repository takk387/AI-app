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

import React, {
  useRef,
  useState,
  useCallback,
  useMemo,
  Component,
  ErrorInfo,
  ReactNode,
} from 'react';
import { SandpackProvider, SandpackPreview } from '@codesandbox/sandpack-react';
import { FloatingEditBubble } from './FloatingEditBubble';
import { useInspectorBridge, createInspectorFileContent } from '@/utils/inspectorBridge';
import type { AppFile } from '@/types/railway';
import type { PipelineProgress, PipelineStepName, PipelineStepStatus } from '@/types/titanPipeline';
import { PIPELINE_STEP_LABELS } from '@/types/titanPipeline';

// ============================================================================
// ERROR BOUNDARY FOR SANDPACK
// ============================================================================

interface SandpackErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary to catch crashes in the Sandpack preview.
 * Displays a friendly fallback UI instead of breaking the entire Layout Builder.
 */
class SandpackErrorBoundary extends Component<
  { children: ReactNode; onRetry?: () => void },
  SandpackErrorBoundaryState
> {
  state: SandpackErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): SandpackErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SandpackErrorBoundary] Preview crashed:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 bg-red-50 text-center">
          <svg
            className="w-12 h-12 text-red-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Preview Error</h3>
          <p className="text-sm text-red-600 mb-4 max-w-md">
            The generated code caused an error. This usually happens when the AI produces invalid
            syntax.
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Retry Preview
          </button>
          {this.state.error && (
            <pre className="mt-4 p-3 text-xs text-left bg-red-100 rounded max-w-full overflow-auto max-h-32">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================================
// VIEWPORT PRESETS
// ============================================================================

type ViewportPreset = 'desktop' | 'tablet' | 'phone';

const VIEWPORT_PRESETS: Record<
  ViewportPreset,
  { width: number; height: number; label: string; icon: string }
> = {
  desktop: {
    width: 1440,
    height: 900,
    label: 'Desktop',
    icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  tablet: {
    width: 768,
    height: 1024,
    label: 'Tablet',
    icon: 'M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  },
  phone: {
    width: 375,
    height: 812,
    label: 'Phone',
    icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
  },
};

// ============================================================================
// SANDPACK CONFIGURATION
// ============================================================================

/** Dependencies pre-loaded in Sandpack for generated code */
const SANDPACK_DEPENDENCIES: Record<string, string> = {
  'framer-motion': 'latest',
  'lucide-react': 'latest',
  'react-router-dom': 'latest',
  clsx: 'latest',
  'tailwind-merge': 'latest',
};

/** Tailwind CSS CDN for external resource injection */
const TAILWIND_CDN = 'https://cdn.tailwindcss.com';

/** Default entry file when Builder doesn't output one */
const DEFAULT_ENTRY_CODE = [
  "import './preflight-undo';",
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
  /** Original canvas dimensions from manifest (for viewport scaling) */
  canvasSize?: { width: number; height: number } | null;
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

  // Undo Tailwind preflight resets for accurate design replication.
  // CSS `revert` restores user-agent defaults that preflight overrides.
  result['/preflight-undo.ts'] = {
    code: `const style = document.createElement('style');
style.textContent = \`
  h1, h2, h3, h4, h5, h6 { font-size: revert; font-weight: revert; margin: revert; }
  p { margin: revert; }
  ol, ul { list-style: revert; margin: revert; padding: revert; }
  img, svg, video { display: revert; }
  a { color: revert; text-decoration: revert; }
  hr { border-top-width: revert; }
  blockquote, dd, dl, figure, pre { margin: revert; }
\`;
document.head.appendChild(style);
`,
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
    case 'completed':
      return <span className="w-2 h-2 rounded-full bg-green-600" />;
    case 'error':
      return <span className="w-2 h-2 rounded-full bg-red-600" />;
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
    case 'completed':
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
  canvasSize,
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
  const [viewport, setViewport] = useState<ViewportPreset>('desktop');
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const inspector = useInspectorBridge();

  const hasFiles = generatedFiles.length > 0;
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;
  const currentViewport = VIEWPORT_PRESETS[viewport];

  // Calculate scale factor for viewport fitting (prevent "zoomed in" appearance)
  // Only scale down if the original canvas is larger than current viewport
  const viewportScale = useMemo(() => {
    if (!canvasSize || viewport === 'desktop') return 1;

    const scaleX = currentViewport.width / canvasSize.width;
    const scaleY = currentViewport.height / canvasSize.height;
    const scale = Math.min(scaleX, scaleY, 1); // Never scale up, only down

    return scale;
  }, [canvasSize, currentViewport, viewport]);

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
              {(pipelineProgress &&
                pipelineProgress.steps[pipelineProgress.currentStep]?.message) ||
                'Processing...'}
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

        {/* Viewport Switcher */}
        <div className="flex items-center gap-1 px-3 border-l border-r border-gray-200">
          {(['desktop', 'tablet', 'phone'] as ViewportPreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => setViewport(preset)}
              className={`p-2 rounded transition-colors ${
                viewport === preset
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
              title={`${VIEWPORT_PRESETS[preset].label} (${VIEWPORT_PRESETS[preset].width}×${VIEWPORT_PRESETS[preset].height})`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d={VIEWPORT_PRESETS[preset].icon}
                />
              </svg>
            </button>
          ))}
          <span className="text-xs text-gray-400 ml-2">
            {currentViewport.width}×{currentViewport.height}
          </span>
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
            {(
              Object.entries(pipelineProgress.steps) as [
                PipelineStepName,
                { status: PipelineStepStatus; message?: string },
              ][]
            ).map(([step, stepData]) => (
              <div key={step} className="flex items-center gap-1.5">
                <StepIndicator status={stepData.status} />
                <span className={`text-xs ${stepTextClass(stepData.status)}`}>
                  {PIPELINE_STEP_LABELS[step]}
                </span>
              </div>
            ))}
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
        className={`flex-1 overflow-auto relative transition-colors layout-canvas-sandpack flex items-start justify-center p-4 ${
          dragActive ? 'bg-blue-50' : 'bg-gray-100'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleBackgroundClick}
      >
        {/* Sandpack Preview (when generated code exists) */}
        {hasFiles && sandpackFiles && (
          <div
            className={`bg-white shadow-xl rounded-lg overflow-hidden transition-all duration-300 ${
              viewport === 'desktop' ? 'w-full h-full' : ''
            }`}
            style={{
              width: viewport === 'desktop' ? '100%' : currentViewport.width,
              height: viewport === 'desktop' ? '100%' : currentViewport.height,
              maxWidth: '100%',
              maxHeight: '100%',
              // Apply viewport scaling to fit large designs
              transform: viewportScale < 1 ? `scale(${viewportScale})` : undefined,
              transformOrigin: 'top left',
              // Device frame effect for mobile/tablet
              boxShadow:
                viewport !== 'desktop'
                  ? '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
                  : undefined,
            }}
          >
            <SandpackErrorBoundary>
              <SandpackProvider
                template="react-ts"
                files={sandpackFiles}
                customSetup={{
                  dependencies: SANDPACK_DEPENDENCIES,
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
                <div
                  id="layout-builder-preview"
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
            </SandpackErrorBoundary>
          </div>
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
                {(pipelineProgress &&
                  pipelineProgress.steps[pipelineProgress.currentStep]?.message) ||
                  'Generating layout...'}
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
