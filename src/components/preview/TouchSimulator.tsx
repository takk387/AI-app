'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface TouchSimulatorProps {
  enabled: boolean;
  children: React.ReactNode;
  iframeSelector?: string;
  className?: string;
}

// ============================================================================
// TOUCH CURSOR COMPONENT
// ============================================================================

function TouchCursor({
  position,
  isPressed,
}: {
  position: { x: number; y: number } | null;
  isPressed: boolean;
}) {
  if (!position) return null;

  return (
    <div
      className="fixed pointer-events-none z-[9999] transition-transform duration-75"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Outer ring */}
      <div
        className={`rounded-full border-2 transition-all duration-100 ${
          isPressed
            ? 'w-10 h-10 border-blue-400 bg-blue-400/30'
            : 'w-8 h-8 border-blue-300/50 bg-transparent'
        }`}
      />
      {/* Inner dot */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-100 ${
          isPressed ? 'w-3 h-3 bg-blue-400' : 'w-2 h-2 bg-blue-300/70'
        }`}
      />
      {/* Ripple effect on press */}
      {isPressed && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-blue-400/50 animate-ping" />
      )}
    </div>
  );
}

// ============================================================================
// TOUCH INDICATOR BADGE
// ============================================================================

function TouchModeBadge() {
  return (
    <div className="absolute top-2 left-2 z-50 flex items-center gap-1.5 px-2 py-1 bg-blue-600/90 text-white text-xs font-medium rounded-full shadow-lg">
      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      <span>Touch Mode</span>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TouchSimulator({
  enabled,
  children,
  iframeSelector = 'iframe',
  className = '',
}: TouchSimulatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [isPressed, setIsPressed] = useState(false);
  const [touchId] = useState(() => Math.floor(Math.random() * 1000));
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Find iframe within the container
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const findIframe = () => {
      const iframe = containerRef.current?.querySelector(
        iframeSelector
      ) as HTMLIFrameElement | null;
      iframeRef.current = iframe;

      if (iframe) {
        // Inject touch-specific CSS into iframe
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            const style = iframeDoc.createElement('style');
            style.id = 'touch-simulator-styles';
            style.textContent = `
              * {
                cursor: none !important;
                -webkit-tap-highlight-color: transparent !important;
                touch-action: manipulation !important;
                user-select: none !important;
                -webkit-user-select: none !important;
              }
              *:hover {
                cursor: none !important;
              }
              /* Disable hover effects */
              @media (hover: hover) {
                *:hover {
                  opacity: inherit;
                  transform: inherit;
                  background: inherit;
                }
              }
            `;

            // Remove existing style if present
            const existing = iframeDoc.getElementById('touch-simulator-styles');
            if (existing) existing.remove();

            iframeDoc.head.appendChild(style);
          }
        } catch {
          // Cross-origin iframe, can't inject styles - silently ignore
        }
      }
    };

    // Initial find
    findIframe();

    // Re-find on iframe load
    const observer = new MutationObserver(findIframe);
    observer.observe(containerRef.current, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      // Clean up injected styles
      try {
        const iframeDoc =
          iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
        const existing = iframeDoc?.getElementById('touch-simulator-styles');
        if (existing) existing.remove();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [enabled, iframeSelector]);

  // Create and dispatch touch event to iframe
  const dispatchTouchEvent = useCallback(
    (type: 'touchstart' | 'touchmove' | 'touchend', clientX: number, clientY: number) => {
      if (!iframeRef.current) return;

      try {
        const iframe = iframeRef.current;
        const iframeRect = iframe.getBoundingClientRect();
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        const iframeWin = iframe.contentWindow;

        if (!iframeDoc || !iframeWin) return;

        // Calculate position relative to iframe
        const relativeX = clientX - iframeRect.left;
        const relativeY = clientY - iframeRect.top;

        // Find element at point
        const element = iframeDoc.elementFromPoint(relativeX, relativeY);
        if (!element) return;

        // Create touch object
        const touch = new (iframeWin as Window & typeof globalThis).Touch({
          identifier: touchId,
          target: element,
          clientX: relativeX,
          clientY: relativeY,
          screenX: clientX,
          screenY: clientY,
          pageX: relativeX + iframeWin.scrollX,
          pageY: relativeY + iframeWin.scrollY,
          radiusX: 10,
          radiusY: 10,
          rotationAngle: 0,
          force: type === 'touchend' ? 0 : 1,
        });

        // Create touch event
        const touchEvent = new (iframeWin as Window & typeof globalThis).TouchEvent(type, {
          bubbles: true,
          cancelable: true,
          view: iframeWin,
          touches: type === 'touchend' ? [] : [touch],
          targetTouches: type === 'touchend' ? [] : [touch],
          changedTouches: [touch],
        });

        // Dispatch event
        element.dispatchEvent(touchEvent);

        // Also dispatch pointer events for better compatibility
        const pointerType =
          type === 'touchstart'
            ? 'pointerdown'
            : type === 'touchmove'
              ? 'pointermove'
              : 'pointerup';

        const pointerEvent = new (iframeWin as Window & typeof globalThis).PointerEvent(
          pointerType,
          {
            bubbles: true,
            cancelable: true,
            view: iframeWin,
            clientX: relativeX,
            clientY: relativeY,
            screenX: clientX,
            screenY: clientY,
            pointerType: 'touch',
            isPrimary: true,
            pointerId: touchId,
            pressure: pointerType === 'pointerup' ? 0 : 0.5,
            width: 20,
            height: 20,
          }
        );

        element.dispatchEvent(pointerEvent);
      } catch {
        // Cross-origin or other error - silently ignore
      }
    },
    [touchId]
  );

  // Mouse event handlers
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled) return;
      setCursorPosition({ x: e.clientX, y: e.clientY });
      if (isPressed) {
        dispatchTouchEvent('touchmove', e.clientX, e.clientY);
      }
    },
    [enabled, isPressed, dispatchTouchEvent]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled) return;
      e.preventDefault();
      setIsPressed(true);
      dispatchTouchEvent('touchstart', e.clientX, e.clientY);
    },
    [enabled, dispatchTouchEvent]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled) return;
      setIsPressed(false);
      dispatchTouchEvent('touchend', e.clientX, e.clientY);
    },
    [enabled, dispatchTouchEvent]
  );

  const handleMouseLeave = useCallback(() => {
    setCursorPosition(null);
    if (isPressed) {
      setIsPressed(false);
    }
  }, [isPressed]);

  // If not enabled, just render children
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: 'none' }}
    >
      {/* Touch mode indicator */}
      <TouchModeBadge />

      {/* Content */}
      {children}

      {/* Touch cursor */}
      <TouchCursor position={cursorPosition} isPressed={isPressed} />
    </div>
  );
}

export default TouchSimulator;
