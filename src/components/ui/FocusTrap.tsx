'use client';

/**
 * FocusTrap Component
 *
 * Traps keyboard focus within a container when active.
 * Features:
 * - Tab cycles through focusable elements within the container
 * - Shift+Tab cycles backwards
 * - Auto-focuses the first focusable element on mount
 * - Returns focus to the trigger element on unmount
 * - Supports Escape key to close
 */

import React, { useEffect, useRef, useCallback } from 'react';

interface FocusTrapProps {
  /** Content to wrap with focus trap */
  children: React.ReactNode;
  /** Whether the focus trap is active */
  active?: boolean;
  /** Called when Escape key is pressed */
  onEscape?: () => void;
  /** Whether to auto-focus the first element on mount */
  autoFocus?: boolean;
  /** Whether to return focus to trigger on unmount */
  returnFocus?: boolean;
  /** Additional class name for the wrapper */
  className?: string;
}

// Selector for all focusable elements
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

/**
 * Get all focusable elements within a container
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  return Array.from(elements).filter(
    (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
  );
}

export function FocusTrap({
  children,
  active = true,
  onEscape,
  autoFocus = true,
  returnFocus = true,
  className,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Store the element that had focus before the trap was activated
  useEffect(() => {
    if (active && returnFocus) {
      triggerRef.current = document.activeElement;
    }

    return () => {
      // Return focus to trigger element when unmounting
      if (returnFocus && triggerRef.current instanceof HTMLElement) {
        // Use setTimeout to ensure the modal is fully closed
        setTimeout(() => {
          if (triggerRef.current instanceof HTMLElement) {
            triggerRef.current.focus();
          }
        }, 0);
      }
    };
  }, [active, returnFocus]);

  // Auto-focus the first focusable element
  useEffect(() => {
    if (active && autoFocus && containerRef.current) {
      const focusableElements = getFocusableElements(containerRef.current);
      if (focusableElements.length > 0) {
        // Small delay to ensure DOM is ready
        requestAnimationFrame(() => {
          focusableElements[0].focus();
        });
      }
    }
  }, [active, autoFocus]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!active || !containerRef.current) return;

      // Handle Escape key
      if (e.key === 'Escape') {
        e.stopPropagation();
        onEscape?.();
        return;
      }

      // Handle Tab key for focus cycling
      if (e.key === 'Tab') {
        const focusableElements = getFocusableElements(containerRef.current);
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement;

        // Shift+Tab from first element -> go to last
        if (e.shiftKey && activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
          return;
        }

        // Tab from last element -> go to first
        if (!e.shiftKey && activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
          return;
        }

        // If focus is outside the trap, bring it back
        if (!containerRef.current.contains(activeElement)) {
          e.preventDefault();
          firstElement.focus();
          return;
        }
      }
    },
    [active, onEscape]
  );

  // Keep focus within the trap if it escapes
  useEffect(() => {
    if (!active) return;

    const handleFocusIn = (e: FocusEvent) => {
      if (
        containerRef.current &&
        e.target instanceof Node &&
        !containerRef.current.contains(e.target)
      ) {
        const focusableElements = getFocusableElements(containerRef.current);
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, [active]);

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown} className={className}>
      {children}
    </div>
  );
}

export default FocusTrap;
