'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
}

/**
 * Toast input type for showToast - supports object-based API
 */
interface ToastInput {
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: ((toast: ToastInput) => void) & ((type: ToastType, message: string, duration?: number) => void);
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Toast notification icons by type
 */
const toastIcons: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️'
};

/**
 * Toast notification styles by type
 */
const toastStyles: Record<ToastType, string> = {
  success: 'bg-green-500/20 border-green-500/30 text-green-200',
  error: 'bg-red-500/20 border-red-500/30 text-red-200',
  warning: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-200',
  info: 'bg-blue-500/20 border-blue-500/30 text-blue-200'
};

/**
 * Single Toast component
 */
interface ToastItemProps {
  toast: Toast;
  onClose: (id: string) => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const exitTimer = setTimeout(() => {
        setIsExiting(true);
      }, toast.duration - 300);

      const removeTimer = setTimeout(() => {
        onClose(toast.id);
      }, toast.duration);

      return () => {
        clearTimeout(exitTimer);
        clearTimeout(removeTimer);
      };
    }
  }, [toast.id, toast.duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(toast.id), 300);
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm
        transition-all duration-300
        ${toastStyles[toast.type]}
        ${isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
      `}
      role="alert"
    >
      <span className="text-lg flex-shrink-0">{toastIcons[toast.type]}</span>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
        aria-label="Dismiss notification"
      >
        <span className="text-sm opacity-70 hover:opacity-100">✕</span>
      </button>
    </div>
  );
}

/**
 * Toast Provider - Wraps app and provides toast functionality
 */
interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Support both API styles: showToast(type, message, duration) and showToast({ type, message, duration })
  const showToast = useCallback((typeOrToast: ToastType | ToastInput, message?: string, duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    let newToast: Toast;
    if (typeof typeOrToast === 'object') {
      // Object-based API: showToast({ type, message, duration })
      newToast = {
        id,
        type: typeOrToast.type,
        message: typeOrToast.message,
        description: typeOrToast.description,
        duration: typeOrToast.duration ?? 4000
      };
    } else {
      // Legacy API: showToast(type, message, duration)
      newToast = {
        id,
        type: typeOrToast,
        message: message || '',
        duration
      };
    }

    setToasts((prev) => [...prev, newToast]);
  }, []) as ToastContextType['showToast'];

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      
      {/* Toast Container */}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto animate-fade-in-up">
            <ToastItem toast={toast} onClose={hideToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * useToast hook - Access toast functions
 */
export function useToast() {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}

/**
 * Standalone Toast component for direct rendering
 */
interface StandaloneToastProps {
  type: ToastType;
  message: string;
  onClose?: () => void;
}

export function Toast({ type, message, onClose }: StandaloneToastProps) {
  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm
        ${toastStyles[type]}
      `}
      role="alert"
    >
      <span className="text-lg flex-shrink-0">{toastIcons[type]}</span>
      <p className="flex-1 text-sm font-medium">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Dismiss notification"
        >
          <span className="text-sm opacity-70 hover:opacity-100">✕</span>
        </button>
      )}
    </div>
  );
}

export default Toast;
