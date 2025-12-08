'use client';

/**
 * DesignComparison Component
 *
 * Side-by-side comparison view for reference design vs. generated output.
 * Supports synchronized scrolling, overlay modes, and clickable regions
 * for adjustment requests.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { CompleteDesignAnalysis } from '@/types/layoutDesign';

// ============================================================================
// TYPES
// ============================================================================

type ViewMode = 'side-by-side' | 'overlay' | 'slider' | 'toggle';
type ZoomLevel = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;

interface DesignComparisonProps {
  referenceImage: string;
  generatedPreview: React.ReactNode;
  analysis?: CompleteDesignAnalysis | null;
  onRequestAdjustment?: (element: string, property: string, description: string) => void;
  className?: string;
}

interface ClickableRegion {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const VIEW_MODES: { id: ViewMode; label: string; icon: string }[] = [
  { id: 'side-by-side', label: 'Side by Side', icon: '⬜⬜' },
  { id: 'overlay', label: 'Overlay', icon: '🔲' },
  { id: 'slider', label: 'Slider', icon: '↔️' },
  { id: 'toggle', label: 'Toggle', icon: '🔄' },
];

const ZOOM_LEVELS: ZoomLevel[] = [0.5, 0.75, 1, 1.25, 1.5, 2];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ViewModeSelector({
  mode,
  onModeChange,
}: {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="flex gap-1 p-1 bg-slate-800 rounded-lg">
      {VIEW_MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => onModeChange(m.id)}
          className={`
            px-3 py-1.5 rounded text-sm transition-all
            ${
              mode === m.id
                ? 'bg-blue-500 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }
          `}
          title={m.label}
        >
          <span className="mr-1">{m.icon}</span>
          <span className="hidden sm:inline">{m.label}</span>
        </button>
      ))}
    </div>
  );
}

function ZoomControl({
  zoom,
  onZoomChange,
}: {
  zoom: ZoomLevel;
  onZoomChange: (zoom: ZoomLevel) => void;
}) {
  const zoomIndex = ZOOM_LEVELS.indexOf(zoom);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => zoomIndex > 0 && onZoomChange(ZOOM_LEVELS[zoomIndex - 1])}
        disabled={zoomIndex === 0}
        className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        −
      </button>
      <span className="text-sm text-slate-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
      <button
        onClick={() =>
          zoomIndex < ZOOM_LEVELS.length - 1 && onZoomChange(ZOOM_LEVELS[zoomIndex + 1])
        }
        disabled={zoomIndex === ZOOM_LEVELS.length - 1}
        className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        +
      </button>
    </div>
  );
}

function PanelLabel({ label, position }: { label: string; position: 'left' | 'right' | 'center' }) {
  const positionClasses = {
    left: 'left-2',
    right: 'right-2',
    center: 'left-1/2 -translate-x-1/2',
  };

  return (
    <div
      className={`absolute top-2 ${positionClasses[position]} z-10 px-2 py-1 rounded bg-black/70 text-white text-xs font-medium`}
    >
      {label}
    </div>
  );
}

function SliderHandle({ position, onDrag }: { position: number; onDrag: (x: number) => void }) {
  const handleRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !handleRef.current) return;
      const parent = handleRef.current.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onDrag(x);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onDrag]);

  return (
    <div
      ref={handleRef}
      className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20 shadow-lg"
      style={{ left: `${position * 100}%` }}
      onMouseDown={handleMouseDown}
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
        <span className="text-slate-600 text-sm">↔</span>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DesignComparison({
  referenceImage,
  generatedPreview,
  analysis,
  onRequestAdjustment,
  className = '',
}: DesignComparisonProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [zoom, setZoom] = useState<ZoomLevel>(1);
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [sliderPosition, setSliderPosition] = useState(0.5);
  const [showGenerated, setShowGenerated] = useState(true);
  const [syncScroll, setSyncScroll] = useState(true);
  const [showClickableRegions, setShowClickableRegions] = useState(false);

  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  // Synchronized scrolling
  const handleScroll = useCallback(
    (source: 'left' | 'right') => {
      if (!syncScroll) return;

      const sourceRef = source === 'left' ? leftPanelRef : rightPanelRef;
      const targetRef = source === 'left' ? rightPanelRef : leftPanelRef;

      if (sourceRef.current && targetRef.current) {
        targetRef.current.scrollTop = sourceRef.current.scrollTop;
        targetRef.current.scrollLeft = sourceRef.current.scrollLeft;
      }
    },
    [syncScroll]
  );

  // Generate clickable regions from analysis
  const clickableRegions: ClickableRegion[] = React.useMemo(() => {
    if (!analysis?.components) return [];

    const regions: ClickableRegion[] = [];

    // Add regions based on detected components
    if (analysis.components.header) {
      regions.push({ id: 'header', name: 'Header', x: 0, y: 0, width: 100, height: 10 });
    }
    if (analysis.components.hero) {
      regions.push({ id: 'hero', name: 'Hero Section', x: 0, y: 10, width: 100, height: 40 });
    }
    if (analysis.components.navigation) {
      regions.push({ id: 'nav', name: 'Navigation', x: 0, y: 2, width: 100, height: 6 });
    }

    return regions;
  }, [analysis]);

  // Handle region click
  const handleRegionClick = useCallback(
    (region: ClickableRegion) => {
      if (onRequestAdjustment) {
        const description = `Adjust the ${region.name.toLowerCase()} to match the reference more closely`;
        onRequestAdjustment(region.id, 'style', description);
      }
    },
    [onRequestAdjustment]
  );

  // Render reference image
  const renderReference = (showLabel = true) => (
    <div className="relative w-full h-full">
      {showLabel && <PanelLabel label="Reference" position="left" />}
      <img
        src={referenceImage}
        alt="Reference design"
        className="w-full h-full object-contain"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
      />
    </div>
  );

  // Render generated preview
  const renderGenerated = (showLabel = true) => (
    <div className="relative w-full h-full">
      {showLabel && <PanelLabel label="Generated" position="right" />}
      <div
        className="w-full h-full"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
      >
        {generatedPreview}
      </div>

      {/* Clickable regions overlay */}
      {showClickableRegions &&
        clickableRegions.map((region) => (
          <button
            key={region.id}
            onClick={() => handleRegionClick(region)}
            className="absolute border-2 border-dashed border-blue-400/50 hover:border-blue-400 hover:bg-blue-400/10 transition-all cursor-pointer group"
            style={{
              left: `${region.x}%`,
              top: `${region.y}%`,
              width: `${region.width}%`,
              height: `${region.height}%`,
            }}
            title={`Adjust ${region.name}`}
          >
            <span className="absolute top-1 left-1 px-1 py-0.5 text-xs bg-blue-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity">
              {region.name}
            </span>
          </button>
        ))}
    </div>
  );

  // Render based on view mode
  const renderContent = () => {
    switch (viewMode) {
      case 'side-by-side':
        return (
          <div className="flex h-full gap-2">
            {/* Reference Panel */}
            <div
              ref={leftPanelRef}
              onScroll={() => handleScroll('left')}
              className="flex-1 overflow-auto border border-white/10 rounded-lg bg-slate-900"
            >
              {renderReference()}
            </div>

            {/* Generated Panel */}
            <div
              ref={rightPanelRef}
              onScroll={() => handleScroll('right')}
              className="flex-1 overflow-auto border border-white/10 rounded-lg bg-slate-900"
            >
              {renderGenerated()}
            </div>
          </div>
        );

      case 'overlay':
        return (
          <div className="relative h-full overflow-auto border border-white/10 rounded-lg bg-slate-900">
            {/* Base layer - Generated */}
            <div className="absolute inset-0">{renderGenerated(false)}</div>

            {/* Overlay - Reference */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ opacity: overlayOpacity }}
            >
              {renderReference(false)}
            </div>

            {/* Labels */}
            <PanelLabel label="Overlay Mode" position="center" />

            {/* Opacity slider */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 bg-black/80 rounded-lg">
              <span className="text-xs text-slate-400">Generated</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                className="w-32 accent-blue-500"
              />
              <span className="text-xs text-slate-400">Reference</span>
            </div>
          </div>
        );

      case 'slider':
        return (
          <div className="relative h-full overflow-hidden border border-white/10 rounded-lg bg-slate-900">
            {/* Generated (full width) */}
            <div className="absolute inset-0">{renderGenerated(false)}</div>

            {/* Reference (clipped by slider) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPosition * 100}%` }}
            >
              {renderReference(false)}
            </div>

            {/* Slider handle */}
            <SliderHandle position={sliderPosition} onDrag={setSliderPosition} />

            {/* Labels */}
            <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded bg-black/70 text-white text-xs">
              Reference
            </div>
            <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded bg-black/70 text-white text-xs">
              Generated
            </div>
          </div>
        );

      case 'toggle':
        return (
          <div className="relative h-full overflow-auto border border-white/10 rounded-lg bg-slate-900">
            {showGenerated ? renderGenerated() : renderReference()}

            {/* Toggle button */}
            <button
              onClick={() => setShowGenerated(!showGenerated)}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <span>🔄</span>
              <span>Toggle View</span>
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 p-3 bg-slate-800/50 border-b border-white/10">
        {/* View Mode Selector */}
        <ViewModeSelector mode={viewMode} onModeChange={setViewMode} />

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Sync scroll toggle */}
          {viewMode === 'side-by-side' && (
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={syncScroll}
                onChange={(e) => setSyncScroll(e.target.checked)}
                className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
              />
              Sync scroll
            </label>
          )}

          {/* Clickable regions toggle */}
          {onRequestAdjustment && (
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showClickableRegions}
                onChange={(e) => setShowClickableRegions(e.target.checked)}
                className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
              />
              Show regions
            </label>
          )}

          {/* Zoom control */}
          <ZoomControl zoom={zoom} onZoomChange={setZoom} />
        </div>
      </div>

      {/* Comparison View */}
      <div className="flex-1 min-h-0 p-2">{renderContent()}</div>

      {/* Analysis Summary Bar */}
      {analysis && (
        <div className="flex items-center gap-4 p-3 bg-slate-800/50 border-t border-white/10 overflow-x-auto">
          {/* Colors */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-slate-500">Colors:</span>
            <div className="flex gap-1">
              {[
                analysis.colors.primary,
                analysis.colors.secondary,
                analysis.colors.accent,
                analysis.colors.background,
              ]
                .filter(Boolean)
                .slice(0, 4)
                .map((color, i) => (
                  <div
                    key={i}
                    className="w-5 h-5 rounded border border-white/20"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
            </div>
          </div>

          {/* Fonts */}
          {analysis.typography?.headingFont && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-slate-500">Fonts:</span>
              <span className="text-xs text-slate-300">
                {analysis.typography.headingFont.family}
                {analysis.typography.bodyFont?.family &&
                  ` / ${analysis.typography.bodyFont.family}`}
              </span>
            </div>
          )}

          {/* Layout */}
          {analysis.layout?.type && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-slate-500">Layout:</span>
              <span className="text-xs text-purple-400 capitalize">{analysis.layout.type}</span>
            </div>
          )}

          {/* Component count */}
          {analysis.components && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-slate-500">Components:</span>
              <span className="text-xs text-blue-400">
                {
                  Object.keys(analysis.components).filter(
                    (k) => analysis.components[k as keyof typeof analysis.components]
                  ).length
                }
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact comparison for inline use
 */
export function CompactDesignComparison({
  referenceImage,
  generatedPreview,
  className = '',
}: {
  referenceImage: string;
  generatedPreview: React.ReactNode;
  className?: string;
}) {
  const [showGenerated, setShowGenerated] = useState(true);

  return (
    <div className={`relative ${className}`}>
      <div className="overflow-hidden rounded-lg border border-white/10">
        {showGenerated ? (
          <div className="w-full">{generatedPreview}</div>
        ) : (
          <img src={referenceImage} alt="Reference" className="w-full" />
        )}
      </div>

      <button
        onClick={() => setShowGenerated(!showGenerated)}
        className="absolute top-2 right-2 px-2 py-1 text-xs bg-black/70 text-white rounded hover:bg-black/90 transition-colors"
      >
        {showGenerated ? 'Show Reference' : 'Show Generated'}
      </button>
    </div>
  );
}

export default DesignComparison;
