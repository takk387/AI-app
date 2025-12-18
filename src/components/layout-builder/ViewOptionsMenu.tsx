'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ViewOptionsMenuProps {
  // Animation Demo
  isAnimationDemo: boolean;
  onStartDemo: () => void;
  onStopDemo: () => void;
  // Image Generation
  hasGeneratedImages: boolean;
  isGeneratingImages: boolean;
  imageProgress: number;
  onGenerateImages: () => void;
  onClearImages: () => void;
  // Grid Overlay
  showGridOverlay: boolean;
  onToggleGrid: () => void;
}

/**
 * Dropdown menu for view options: Demo, Images, Grid
 * Consolidates toolbar buttons to reduce clutter
 */
export function ViewOptionsMenu({
  isAnimationDemo,
  onStartDemo,
  onStopDemo,
  hasGeneratedImages,
  isGeneratingImages,
  imageProgress,
  onGenerateImages,
  onClearImages,
  showGridOverlay,
  onToggleGrid,
}: ViewOptionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close menu on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleItemClick = (action: () => void) => {
    action();
    // Don't close menu for toggle actions so user can see the state change
  };

  // Count active features for badge
  const activeCount = [isAnimationDemo, hasGeneratedImages, showGridOverlay].filter(Boolean).length;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-2 ${
          isOpen || activeCount > 0
            ? 'bg-slate-700 text-white'
            : 'text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700'
        }`}
        title="View Options"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        View
        {activeCount > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] bg-blue-600 text-white rounded-full">
            {activeCount}
          </span>
        )}
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1 overflow-hidden">
          {/* Animation Demo */}
          <button
            onClick={() => handleItemClick(isAnimationDemo ? onStopDemo : onStartDemo)}
            className="w-full px-3 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-3"
          >
            <div className="relative">
              {isAnimationDemo ? (
                <span className="relative flex h-4 w-4 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                </span>
              ) : (
                <svg
                  className="w-4 h-4 text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <div className="font-medium">{isAnimationDemo ? 'Stop Demo' : 'Animation Demo'}</div>
              <div className="text-xs text-slate-500">
                {isAnimationDemo ? 'Currently running' : 'Preview element animations'}
              </div>
            </div>
            {isAnimationDemo && (
              <span className="px-1.5 py-0.5 text-[10px] bg-purple-600 text-white rounded-full">
                On
              </span>
            )}
          </button>

          {/* Generate/Clear Images */}
          <button
            onClick={() => handleItemClick(hasGeneratedImages ? onClearImages : onGenerateImages)}
            disabled={isGeneratingImages}
            className="w-full px-3 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-3 disabled:opacity-50 disabled:cursor-wait"
          >
            {isGeneratingImages ? (
              <svg className="w-4 h-4 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24">
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
            ) : hasGeneratedImages ? (
              <svg
                className="w-4 h-4 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            )}
            <div className="flex-1">
              <div className="font-medium">
                {isGeneratingImages
                  ? `Generating... ${imageProgress}%`
                  : hasGeneratedImages
                    ? 'Clear Images'
                    : 'Generate Images'}
              </div>
              <div className="text-xs text-slate-500">
                {isGeneratingImages
                  ? 'Please wait'
                  : hasGeneratedImages
                    ? 'Remove AI-generated images'
                    : 'AI images for preview'}
              </div>
            </div>
            {hasGeneratedImages && !isGeneratingImages && (
              <span className="px-1.5 py-0.5 text-[10px] bg-green-600 text-white rounded-full">
                On
              </span>
            )}
          </button>

          <div className="border-t border-slate-700 my-1" />

          {/* Grid Overlay */}
          <button
            onClick={() => handleItemClick(onToggleGrid)}
            className="w-full px-3 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-3"
          >
            <svg
              className={`w-4 h-4 ${showGridOverlay ? 'text-cyan-400' : 'text-slate-400'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 9h16M4 15h16M9 4v16M15 4v16"
              />
            </svg>
            <div className="flex-1">
              <div className="font-medium">Grid Overlay</div>
              <div className="text-xs text-slate-500">12-column alignment grid (G)</div>
            </div>
            {showGridOverlay && (
              <span className="px-1.5 py-0.5 text-[10px] bg-cyan-600 text-white rounded-full">
                On
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default ViewOptionsMenu;
