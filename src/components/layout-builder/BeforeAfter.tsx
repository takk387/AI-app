'use client';

import { useState, useCallback } from 'react';

interface BeforeAfterProps {
  /** The "before" state content (can be image URL or HTML) */
  before: string;
  /** The "after" state content (can be image URL or HTML) */
  after: string;
  /** Whether content is HTML (true) or image URLs (false) */
  isHtml?: boolean;
  /** Optional label for before state */
  beforeLabel?: string;
  /** Optional label for after state */
  afterLabel?: string;
  /** Callback when user approves the change */
  onApprove?: () => void;
  /** Callback when user rejects the change */
  onReject?: () => void;
  /** Optional class name */
  className?: string;
}

/**
 * BeforeAfter Component
 *
 * Side-by-side comparison of design changes with slider or toggle view.
 * Shows "before" and "after" states for user approval.
 */
export function BeforeAfter({
  before,
  after,
  isHtml = false,
  beforeLabel = 'Before',
  afterLabel = 'After',
  onApprove,
  onReject,
  className = '',
}: BeforeAfterProps) {
  const [viewMode, setViewMode] = useState<'split' | 'toggle'>('split');
  const [showAfter, setShowAfter] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  // Handle slider drag
  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    },
    [isDragging]
  );

  // Render content (image or HTML)
  const renderContent = (content: string, label: string) => {
    if (isHtml) {
      return (
        <div
          className="w-full h-full overflow-hidden bg-white"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }
    return <img src={content} alt={label} className="w-full h-full object-cover" />;
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* View mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              viewMode === 'split'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Split View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('toggle')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              viewMode === 'toggle'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Toggle View
          </button>
        </div>

        {viewMode === 'toggle' && (
          <button
            type="button"
            onClick={() => setShowAfter(!showAfter)}
            className="px-3 py-1.5 text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Show {showAfter ? beforeLabel : afterLabel}
          </button>
        )}
      </div>

      {/* Comparison view */}
      <div
        className="relative aspect-video bg-slate-800 rounded-lg overflow-hidden select-none"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {viewMode === 'split' ? (
          <>
            {/* Before (left side) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
              {renderContent(before, beforeLabel)}
              <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
                {beforeLabel}
              </div>
            </div>

            {/* After (right side) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
            >
              {renderContent(after, afterLabel)}
              <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
                {afterLabel}
              </div>
            </div>

            {/* Slider handle */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-10"
              style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
              onMouseDown={handleMouseDown}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-slate-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 9l4-4 4 4m0 6l-4 4-4-4"
                  />
                </svg>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Toggle view - show one at a time */}
            <div className="w-full h-full">
              {renderContent(showAfter ? after : before, showAfter ? afterLabel : beforeLabel)}
            </div>
            <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
              {showAfter ? afterLabel : beforeLabel}
            </div>
          </>
        )}
      </div>

      {/* Action buttons */}
      {(onApprove || onReject) && (
        <div className="flex items-center justify-end gap-2">
          {onReject && (
            <button
              type="button"
              onClick={onReject}
              className="px-4 py-2 text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Try Different
            </button>
          )}
          {onApprove && (
            <button
              type="button"
              onClick={onApprove}
              className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Looks Good
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default BeforeAfter;
