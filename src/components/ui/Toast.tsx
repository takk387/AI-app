'use client';

/**
 * Toast Component
 *
 * A styled toast notification component that displays messages to users.
 */

import React, { useEffect, useState } from 'react';
import type { Toast as ToastType, ToastType as ToastVariant } from '@/hooks/useToast';

// ============================================================================
// TYPES
// ============================================================================

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

interface ToastContainerProps {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center';
}

// ============================================================================
// ICON COMPONENTS
// ============================================================================

function SuccessIcon() {
  return (
    <svg className="w-5 h-5 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg className="w-5 h-5 text-error-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="w-5 h-5 text-garden-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="w-5 h-5 text-warning-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getIcon(type: ToastVariant) {
  switch (type) {
    case 'success':
      return <SuccessIcon />;
    case 'error':
      return <ErrorIcon />;
    case 'warning':
      return <WarningIcon />;
    case 'info':
    default:
      return <InfoIcon />;
  }
}

function getStyles(type: ToastVariant): string {
  const baseStyles = 'border-l-4';

  switch (type) {
    case 'success':
      return `${baseStyles} border-success-500 bg-success-500/10`;
    case 'error':
      return `${baseStyles} border-error-500 bg-error-500/10`;
    case 'warning':
      return `${baseStyles} border-warning-500 bg-warning-500/10`;
    case 'info':
    default:
      return `${baseStyles} border-garden-500 bg-garden-500/10`;
  }
}

function getPositionStyles(position: ToastContainerProps['position']): string {
  switch (position) {
    case 'top-left':
      return 'top-4 left-4';
    case 'bottom-right':
      return 'bottom-4 right-4';
    case 'bottom-left':
      return 'bottom-4 left-4';
    case 'top-center':
      return 'top-4 left-1/2 -translate-x-1/2';
    case 'bottom-center':
      return 'bottom-4 left-1/2 -translate-x-1/2';
    case 'top-right':
    default:
      return 'top-4 right-4';
  }
}

// ============================================================================
// TOAST COMPONENT
// ============================================================================

export function Toast({ toast, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Handle dismiss with animation
  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 150);
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg shadow-lg backdrop-blur-sm
        bg-slate-800/95 border border-slate-700
        transform transition-all duration-150 ease-out
        ${getStyles(toast.type)}
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}
      `}
      role="alert"
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">{getIcon(toast.type)}</div>

      {/* Message */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white leading-relaxed">{toast.message}</p>
      </div>

      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-slate-400 hover:text-white transition-colors p-1 -m-1"
        aria-label="Dismiss"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

// ============================================================================
// TOAST CONTAINER
// ============================================================================

export function ToastContainer({ toasts, onDismiss, position = 'top-right' }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className={`fixed z-[100] flex flex-col gap-2 max-w-sm w-full ${getPositionStyles(position)}`}
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export default ToastContainer;
