/**
 * Floating Edit Bubble
 *
 * A contextual UI that appears next to a selected component.
 * Allows the user to:
 * 1. Type natural language commands ("Make this blue")
 * 2. Delete the component
 * 3. Duplicate the component
 *
 * It uses absolute positioning relative to the selected element's bounds.
 */

import React, { useState, useEffect, useRef } from 'react';
import { DetectedComponentEnhanced } from '@/types/layoutDesign';

interface FloatingEditBubbleProps {
  component: DetectedComponentEnhanced;
  onClose: () => void;
  onAiEdit: (id: string, prompt: string) => Promise<void>;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export const FloatingEditBubble: React.FC<FloatingEditBubbleProps> = ({
  component,
  onClose,
  onAiEdit,
  onDelete,
  onDuplicate,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when bubble opens
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      await onAiEdit(component.id, prompt);
      setPrompt('');
      onClose(); // Close after successful edit? Or keep open? Let's close for now.
    } catch (error) {
      console.error('Edit failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate position: Just above the element, centered
  // In a real app, we'd use usePopper or similar for collision detection
  // Uses defensive defaults to prevent crashes with missing bounds
  const bounds = component.bounds ?? { top: 0, left: 0, width: 100, height: 50 };
  const style: React.CSSProperties = {
    position: 'absolute',
    top: `${bounds.top}%`,
    left: `${bounds.left + bounds.width / 2}%`,
    transform: 'translate(-50%, -110%)', // Shift up and center
    marginTop: '-8px',
    zIndex: 1000,
  };

  return (
    <div
      style={style}
      className="bg-white shadow-xl rounded-lg border border-gray-200 p-3 w-[280px] animate-in fade-in zoom-in-95 duration-200"
      onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
    >
      {/* Header / Title */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Edit {component.type}
        </span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
          &times;
        </button>
      </div>

      {/* AI Input Form */}
      <form onSubmit={handleSubmit} className="mb-3">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            className="w-full pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Make background red..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="absolute right-1 top-1 p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            )}
          </button>
        </div>
      </form>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onDuplicate(component.id)}
          className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors"
        >
          Duplicate
        </button>
        <button
          onClick={() => onDelete(component.id)}
          className="flex-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
};
