/**
 * Layout Canvas (WebContainer Preview)
 *
 * Renders generated code in an interactive preview via WebContainers.
 * The inspector bridge enables click-to-select on [data-id] elements.
 * FloatingEditBubble appears for inline editing of selected components.
 */

import React, { useRef, useState, useCallback, useMemo } from 'react';
import { WebContainerPreview } from '@/components/preview/WebContainerPreview';
import { FloatingEditBubble } from './FloatingEditBubble';
import { useInspectorBridge } from '@/utils/inspectorBridge';
import type { AppFile } from '@/types/railway';
import type { PipelineProgress, PipelineStepName, PipelineStepStatus } from '@/types/titanPipeline';
import { PIPELINE_STEP_LABELS } from '@/types/titanPipeline';

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

  // Container offset for FloatingEditBubble positioning.
  // The inspector sends rect relative to the iframe viewport.
  // Since the preview iframe fills its container, offset is 0.
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
        {/* WebContainer Preview (when generated code exists) */}
        {hasFiles && (
          <div
            className={`bg-white shadow-xl rounded-lg overflow-hidden transition-all duration-300 ${
              viewport === 'desktop' ? 'w-full h-full' : ''
            }`}
            style={{
              width: viewport === 'desktop' ? '100%' : currentViewport.width,
              height: viewport === 'desktop' ? '100%' : currentViewport.height,
              maxWidth: '100%',
              maxHeight: '100%',
              transform: viewportScale < 1 ? `scale(${viewportScale})` : undefined,
              transformOrigin: 'top left',
              boxShadow:
                viewport !== 'desktop'
                  ? '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
                  : undefined,
            }}
          >
            <div
              id="layout-builder-preview"
              ref={previewContainerRef}
              className="w-full h-full relative flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <WebContainerPreview files={generatedFiles} className="flex-1" />

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
