"use client";

import React, { useCallback, useRef } from 'react';

// Constants
const DOUBLE_CLICK_THRESHOLD_MS = 300;

// Symbol for component identification
export const RESIZABLE_HANDLE_TYPE = Symbol.for('ResizableHandle');

export interface ResizableHandleProps {
  className?: string;
  hitAreaMargins?: { coarse: number; fine: number };
  disabled?: boolean;
  onDoubleClick?: () => void;
  style?: React.CSSProperties;
}

export interface ResizableHandleContextValue {
  direction: 'horizontal' | 'vertical';
  isDragging: boolean;
  isActive: boolean;
  startResize: (event: React.MouseEvent | React.TouchEvent | React.KeyboardEvent) => void;
  onDoubleClick?: () => void;
}

// Context set by ResizablePanelGroup
export const ResizableHandleContext = React.createContext<ResizableHandleContextValue | null>(null);

/**
 * ResizableHandle - A draggable divider between resizable panels
 * 
 * Features:
 * - Drag to resize adjacent panels
 * - Keyboard accessible (Arrow keys to resize, Home/End for min/max)
 * - Touch support for mobile devices
 * - Visual feedback on hover and drag
 * - Double-click to collapse/expand
 * 
 * @example
 * ```tsx
 * <ResizablePanelGroup direction="horizontal">
 *   <ResizablePanel>Content A</ResizablePanel>
 *   <ResizableHandle />
 *   <ResizablePanel>Content B</ResizablePanel>
 * </ResizablePanelGroup>
 * ```
 */
export function ResizableHandle({
  className = '',
  hitAreaMargins = { coarse: 15, fine: 5 },
  disabled = false,
  onDoubleClick: onDoubleClickProp,
  style = {},
}: ResizableHandleProps) {
  const context = React.useContext(ResizableHandleContext);
  const handleRef = useRef<HTMLDivElement>(null);
  const lastClickTimeRef = useRef<number>(0);

  if (!context) {
    console.warn('ResizableHandle must be used within a ResizablePanelGroup');
    return null;
  }

  const { direction, isDragging, isActive, startResize, onDoubleClick: contextOnDoubleClick } = context;
  const isHorizontal = direction === 'horizontal';

  // Handle mouse down
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (disabled) return;
    
    // Check for double-click
    const now = Date.now();
    if (now - lastClickTimeRef.current < DOUBLE_CLICK_THRESHOLD_MS) {
      // Double-click detected
      const handler = onDoubleClickProp || contextOnDoubleClick;
      if (handler) {
        handler();
        lastClickTimeRef.current = 0;
        return;
      }
    }
    lastClickTimeRef.current = now;
    
    startResize(event);
  }, [disabled, startResize, onDoubleClickProp, contextOnDoubleClick]);

  // Handle touch start
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (disabled) return;
    startResize(event);
  }, [disabled, startResize]);

  // Handle keyboard events for accessibility
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled) return;
    
    const relevantKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (relevantKeys.includes(event.key)) {
      startResize(event);
    }
  }, [disabled, startResize]);

  // Calculate hit area sizes
  const hitAreaSize = isDragging ? hitAreaMargins.coarse : hitAreaMargins.fine;
  
  // Handle styles
  const handleStyle: React.CSSProperties = {
    ...style,
    // Base styles
    position: 'relative',
    flexShrink: 0,
    // Direction-specific
    ...(isHorizontal
      ? {
          width: '4px',
          cursor: disabled ? 'default' : 'col-resize',
        }
      : {
          height: '4px',
          cursor: disabled ? 'default' : 'row-resize',
        }),
    // Expand hit area with pseudo-element margins handled by CSS
  };

  // Build class names
  const classNames = [
    'resize-handle',
    isHorizontal ? 'resize-handle-horizontal' : 'resize-handle-vertical',
    isDragging ? 'resize-handle-dragging' : '',
    isActive ? 'resize-handle-active' : '',
    disabled ? 'resize-handle-disabled' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={handleRef}
      className={classNames}
      style={handleStyle}
      role="separator"
      aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
      aria-valuenow={50} // Would be populated from context with actual position
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={disabled ? -1 : 0}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onKeyDown={handleKeyDown}
      data-handle-hit-area={hitAreaSize}
    >
      {/* Visual indicator */}
      <div 
        className="resize-handle-indicator"
        style={{
          position: 'absolute',
          ...(isHorizontal
            ? {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '2px',
                height: '32px',
                borderRadius: '1px',
              }
            : {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '32px',
                height: '2px',
                borderRadius: '1px',
              }),
          transition: 'background 0.2s, opacity 0.2s',
        }}
      />
    </div>
  );
}

// Attach type symbol for identification
ResizableHandle.displayName = 'ResizableHandle';
(ResizableHandle as any).__RESIZABLE_TYPE__ = RESIZABLE_HANDLE_TYPE;

export default ResizableHandle;
