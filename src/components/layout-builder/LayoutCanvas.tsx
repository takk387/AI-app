/**
 * Layout Canvas (Stateless Preview Component)
 *
 * A stateless canvas component that displays the layout preview.
 * All state is managed by the parent component and passed via props.
 *
 * Features:
 * - Drag & drop file upload
 * - Component selection
 * - Floating edit bubble for selected components
 * - Undo/redo controls
 * - Export functionality
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { DynamicLayoutRenderer } from './DynamicLayoutRenderer';
import { FloatingEditBubble } from './FloatingEditBubble';
import { DetectedComponentEnhanced } from '@/types/layoutDesign';
import type { VisionLoopProgress, SelfHealingResult } from '@/services/VisionLoopEngine';
import type { DesignSpec } from '@/types/designSpec';

export interface LayoutCanvasProps {
  components: DetectedComponentEnhanced[];
  selectedId: string | null;
  isAnalyzing: boolean;
  analysisErrors?: string[];
  analysisWarnings?: string[];
  /** Design specification for font loading */
  designSpec?: DesignSpec | null;
  onSelectComponent: (id: string | null) => void;
  onAnalyzeImage: (file: File, instructions?: string) => Promise<void>;
  onAnalyzeVideo: (file: File, instructions?: string) => Promise<void>;
  onApplyAIEdit: (id: string, prompt: string) => Promise<void>;
  onDeleteComponent: (id: string) => void;
  onDuplicateComponent: (id: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onExportCode: () => void;
  onClearErrors?: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Self-Healing Props
  isHealing?: boolean;
  healingProgress?: VisionLoopProgress | null;
  lastHealingResult?: SelfHealingResult | null;
  originalImage?: string | null;
  onRunSelfHealing?: (
    originalImage: string,
    renderToHtml: () => string
  ) => Promise<SelfHealingResult | null>;
  onCancelHealing?: () => void;
  /** Register the renderToHtml callback for auto-trigger self-healing */
  registerRenderToHtml?: (callback: (() => string) | null) => void;
}

export const LayoutCanvas: React.FC<LayoutCanvasProps> = ({
  components,
  selectedId,
  isAnalyzing,
  analysisErrors = [],
  analysisWarnings = [],
  designSpec = null,
  onSelectComponent,
  onAnalyzeImage,
  onAnalyzeVideo,
  onApplyAIEdit,
  onDeleteComponent,
  onDuplicateComponent,
  onUndo,
  onRedo,
  onExportCode,
  onClearErrors,
  canUndo,
  canRedo,
  // Self-Healing Props
  isHealing = false,
  healingProgress = null,
  lastHealingResult = null,
  originalImage = null,
  onRunSelfHealing,
  onCancelHealing,
  registerRenderToHtml,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [showHealingResult, setShowHealingResult] = useState(false);
  const layoutRef = useRef<HTMLDivElement>(null);

  // Load Google Fonts based on DesignSpec typography
  useEffect(() => {
    if (!designSpec?.typography) return;

    const { headingFont, bodyFont } = designSpec.typography;
    const fonts = [headingFont, bodyFont].filter(
      (f): f is string => !!f && f !== 'Inter' && f !== 'system-ui'
    );

    if (fonts.length === 0) return;

    // Create unique font families (remove duplicates)
    const uniqueFonts = [...new Set(fonts)];

    // Check if fonts are already loaded
    const fontLinkId = 'layout-builder-fonts';
    const existingLink = document.getElementById(fontLinkId);

    // Build Google Fonts URL
    const fontFamilies = uniqueFonts
      .map((f) => f.replace(/\s+/g, '+'))
      .map((f) => `family=${f}:wght@400;500;600;700`)
      .join('&');
    const fontUrl = `https://fonts.googleapis.com/css2?${fontFamilies}&display=swap`;

    // Update or create the font link
    if (existingLink) {
      if (existingLink.getAttribute('href') !== fontUrl) {
        existingLink.setAttribute('href', fontUrl);
      }
    } else {
      const link = document.createElement('link');
      link.id = fontLinkId;
      link.href = fontUrl;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    // Cleanup function - don't remove the link as other components may use it
  }, [designSpec?.typography]);

  // Generate HTML from current layout for self-healing
  const generateLayoutHtml = useCallback((): string => {
    if (!layoutRef.current) return '';
    return layoutRef.current.innerHTML;
  }, []);

  // Register the renderToHtml callback with the hook for auto-trigger
  useEffect(() => {
    if (registerRenderToHtml) {
      registerRenderToHtml(generateLayoutHtml);
      console.log('[LayoutCanvas] Registered renderToHtml callback for auto-trigger');
    }

    // Cleanup on unmount
    return () => {
      if (registerRenderToHtml) {
        registerRenderToHtml(null);
        console.log('[LayoutCanvas] Unregistered renderToHtml callback');
      }
    };
  }, [registerRenderToHtml, generateLayoutHtml]);

  // Handler for auto-refine button
  const handleAutoRefine = useCallback(async () => {
    console.log('[LayoutCanvas] Auto-refine button clicked');
    console.log('[LayoutCanvas] originalImage exists:', !!originalImage);
    console.log('[LayoutCanvas] originalImage length:', originalImage?.length || 0);
    console.log('[LayoutCanvas] onRunSelfHealing exists:', !!onRunSelfHealing);
    console.log('[LayoutCanvas] layoutRef exists:', !!layoutRef.current);

    if (!originalImage) {
      console.error('[LayoutCanvas] Cannot run self-healing: no original image stored');
      return;
    }
    if (!onRunSelfHealing) {
      console.error('[LayoutCanvas] Cannot run self-healing: no handler provided');
      return;
    }

    // Test the generateLayoutHtml function
    const testHtml = generateLayoutHtml();
    console.log('[LayoutCanvas] Generated HTML length:', testHtml?.length || 0);
    console.log('[LayoutCanvas] Generated HTML preview:', testHtml?.substring(0, 200) || 'empty');

    console.log('[LayoutCanvas] Calling onRunSelfHealing...');
    try {
      const result = await onRunSelfHealing(originalImage, generateLayoutHtml);
      console.log('[LayoutCanvas] Self-healing result:', result);
      if (result) {
        setShowHealingResult(true);
      }
    } catch (error) {
      console.error('[LayoutCanvas] Self-healing error:', error);
    }
  }, [originalImage, onRunSelfHealing, generateLayoutHtml]);

  const hasErrors = analysisErrors.length > 0;
  const hasWarnings = analysisWarnings.length > 0;

  // Debug: Log when components change
  console.log('[LayoutCanvas] Rendering with', components.length, 'components');

  // Helper to find selected component data
  const selectedComponent = components.find((c) => c.id === selectedId);

  // --- Upload Handlers ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        await onAnalyzeVideo(file);
      } else {
        await onAnalyzeImage(file);
      }
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-gray-50">
      {/* Toolbar / Status */}
      <div className="h-14 border-b bg-white flex items-center px-4 justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm text-gray-700">Interactive Canvas</span>
          {isAnalyzing && (
            <span className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              AI Analyzing...
            </span>
          )}
          {isHealing && (
            <span className="flex items-center gap-2 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
              Self-Healing...
            </span>
          )}
          {/* Error indicator */}
          {hasErrors && !isAnalyzing && (
            <span className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
              {analysisErrors.length} error{analysisErrors.length > 1 ? 's' : ''}
            </span>
          )}
          {/* Warning indicator */}
          {hasWarnings && !hasErrors && !isAnalyzing && (
            <span className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
              {analysisWarnings.length} warning{analysisWarnings.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* History Controls */}
          <div className="flex gap-2">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-2 rounded hover:bg-gray-100 ${!canUndo ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Undo"
            >
              ↩
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-2 rounded hover:bg-gray-100 ${!canRedo ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Redo"
            >
              ↪
            </button>
          </div>

          <button
            onClick={onExportCode}
            disabled={components.length === 0}
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

          {/* Self-Healing Button */}
          {onRunSelfHealing && (
            <button
              onClick={isHealing ? onCancelHealing : handleAutoRefine}
              disabled={components.length === 0 || !originalImage || isAnalyzing}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                isHealing
                  ? 'text-white bg-red-600 hover:bg-red-700'
                  : 'text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50'
              }`}
              title={isHealing ? 'Cancel healing' : 'Auto-refine layout using AI vision loop'}
            >
              {isHealing ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Cancel
                </>
              ) : (
                <>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Auto-Refine
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Self-Healing Progress Bar */}
      {isHealing && healingProgress && (
        <div className="px-4 py-2 bg-purple-50 border-b border-purple-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-purple-800">{healingProgress.message}</span>
            <span className="text-xs text-purple-600">
              Iteration {healingProgress.iteration}/{healingProgress.maxIterations}
              {healingProgress.fidelityScore !== undefined && (
                <> • Fidelity: {healingProgress.fidelityScore.toFixed(1)}%</>
              )}
            </span>
          </div>
          <div className="w-full bg-purple-200 rounded-full h-1.5">
            <div
              className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (healingProgress.iteration / healingProgress.maxIterations) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Self-Healing Result Summary */}
      {showHealingResult && lastHealingResult && !isHealing && (
        <div className="px-4 py-2 bg-green-50 border-b border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-sm font-medium text-green-800">
                Layout refined in {lastHealingResult.iterations} iteration
                {lastHealingResult.iterations !== 1 ? 's' : ''}
              </span>
              <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                Fidelity: {lastHealingResult.finalFidelityScore.toFixed(1)}%
              </span>
            </div>
            <button
              onClick={() => setShowHealingResult(false)}
              className="text-xs text-green-700 hover:text-green-800 px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Error/Warning Panel */}
      {(hasErrors || hasWarnings) && !isAnalyzing && (
        <div
          className={`px-4 py-2 border-b ${hasErrors ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {hasErrors && (
                <div className="mb-1">
                  <span className="font-medium text-sm text-red-800">Analysis Errors:</span>
                  <ul className="mt-1 text-xs text-red-700 list-disc list-inside">
                    {analysisErrors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              {hasWarnings && (
                <div>
                  <span className="font-medium text-sm text-amber-800">Warnings:</span>
                  <ul className="mt-1 text-xs text-amber-700 list-disc list-inside">
                    {analysisWarnings.map((warning, idx) => (
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

      {/* Main Canvas Area */}
      <div
        className={`flex-1 overflow-auto p-8 relative transition-colors ${dragActive ? 'bg-blue-50' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => onSelectComponent(null)} // Deselect on background click
      >
        <div
          ref={layoutRef}
          className="w-full bg-white shadow-sm ring-1 ring-gray-200 rounded-md relative"
          style={{ height: '800px' }}
        >
          <DynamicLayoutRenderer
            components={components}
            onSelectComponent={onSelectComponent}
            selectedComponentId={selectedId}
          />

          {/* Edit Bubble Overlay */}
          {selectedComponent && (
            <FloatingEditBubble
              component={selectedComponent}
              onClose={() => onSelectComponent(null)}
              onAiEdit={onApplyAIEdit}
              onDelete={onDeleteComponent}
              onDuplicate={onDuplicateComponent}
            />
          )}
        </div>

        {/* Drag Overlay Help Text */}
        {components.length === 0 && !isAnalyzing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center p-6 bg-white/80 backdrop-blur rounded-xl border border-gray-200 shadow-lg">
              <p className="text-lg font-medium text-gray-900">Drop an Image or Video</p>
              <p className="text-sm text-gray-500">The AI will analyze and replicate it.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LayoutCanvas;
