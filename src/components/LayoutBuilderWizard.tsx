'use client';

/**
 * LayoutBuilderWizard Component
 *
 * A modal-based layout builder with conversational AI that can "see" the layout
 * through screenshots and provide visual design feedback.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLayoutBuilder } from '@/hooks/useLayoutBuilder';
import { useToast } from '@/hooks/useToast';
import { LayoutPreview } from '@/components/LayoutPreview';
import { DesignControlPanel } from '@/components/DesignControlPanel';
import { ToastContainer } from '@/components/ui/Toast';
import type {
  LayoutMessage,
  SuggestedAction,
  DesignChange,
  EffectsSettings,
  ColorSettings,
  LayoutDesign,
} from '@/types/layoutDesign';
import type { UIPreferences } from '@/types/appConcept';
import { DESIGN_TEMPLATES, type DesignTemplate } from '@/data/designTemplates';
import { VersionHistoryPanel } from '@/components/VersionHistoryPanel';
import {
  exportToCSSVariables,
  exportToTailwindConfig,
  exportToFigmaTokens,
  exportToReactComponent,
  downloadExport,
  copyToClipboard,
} from '@/utils/layoutExport';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Number of messages to show initially and load incrementally */
const MESSAGES_PAGE_SIZE = 20;

/** Maximum messages to render at once for performance */
const MAX_RENDERED_MESSAGES = 100;

/** Maximum dimensions for compressed reference images */
const MAX_IMAGE_DIMENSION = 800;

/** JPEG quality for compressed images (0-1) */
const IMAGE_COMPRESSION_QUALITY = 0.7;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Compress an image file to a smaller size
 * @param file - The image file to compress
 * @param maxDimension - Maximum width/height
 * @param quality - JPEG quality (0-1)
 * @returns Promise with compressed base64 data URL and size info
 */
async function compressImage(
  file: File,
  maxDimension: number = MAX_IMAGE_DIMENSION,
  quality: number = IMAGE_COMPRESSION_QUALITY
): Promise<{ dataUrl: string; originalSize: number; compressedSize: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
      }

      // Set canvas size and draw image
      canvas.width = width;
      canvas.height = height;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG with compression
      const dataUrl = canvas.toDataURL('image/jpeg', quality);

      // Calculate approximate compressed size (base64 is ~33% larger than binary)
      const compressedSize = Math.round((dataUrl.length * 3) / 4);

      resolve({
        dataUrl,
        originalSize: file.size,
        compressedSize,
      });
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Create object URL from file
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Calculate design completion progress
 * Returns percentages for different categories
 */
function calculateDesignProgress(design: Partial<LayoutDesign>): {
  overall: number;
  colors: number;
  typography: number;
  layout: number;
  components: number;
} {
  // Colors category (12 properties)
  const colorProps = [
    design.globalStyles?.colors?.primary,
    design.globalStyles?.colors?.secondary,
    design.globalStyles?.colors?.accent,
    design.globalStyles?.colors?.background,
    design.globalStyles?.colors?.surface,
    design.globalStyles?.colors?.text,
    design.globalStyles?.colors?.textMuted,
    design.globalStyles?.colors?.border,
    design.globalStyles?.colors?.success,
    design.globalStyles?.colors?.warning,
    design.globalStyles?.colors?.error,
    design.globalStyles?.colors?.info,
  ];
  const colorsSet = colorProps.filter(Boolean).length;
  const colors = Math.round((colorsSet / colorProps.length) * 100);

  // Typography category (7 properties)
  const typoProps = [
    design.globalStyles?.typography?.fontFamily,
    design.globalStyles?.typography?.headingWeight,
    design.globalStyles?.typography?.bodyWeight,
    design.globalStyles?.typography?.headingSize,
    design.globalStyles?.typography?.bodySize,
    design.globalStyles?.typography?.lineHeight,
    design.globalStyles?.typography?.letterSpacing,
  ];
  const typoSet = typoProps.filter(Boolean).length;
  const typography = Math.round((typoSet / typoProps.length) * 100);

  // Layout category (10 properties)
  const layoutProps = [
    design.basePreferences?.style,
    design.basePreferences?.colorScheme,
    design.basePreferences?.layout,
    design.structure?.type,
    design.structure?.hasHeader,
    design.structure?.hasSidebar,
    design.structure?.hasFooter,
    design.structure?.headerType,
    design.structure?.contentLayout,
    design.structure?.mainContentWidth,
  ];
  const layoutSet = layoutProps.filter((v) => v !== undefined).length;
  const layout = Math.round((layoutSet / layoutProps.length) * 100);

  // Components category (5 main component defined)
  const componentProps = [
    design.components?.header?.visible !== undefined,
    design.components?.sidebar?.visible !== undefined,
    design.components?.hero?.visible !== undefined,
    design.components?.cards?.style !== undefined,
    design.components?.footer?.visible !== undefined,
  ];
  const componentsSet = componentProps.filter(Boolean).length;
  const components = Math.round((componentsSet / componentProps.length) * 100);

  // Overall is weighted average
  const overall = Math.round(colors * 0.25 + typography * 0.2 + layout * 0.3 + components * 0.25);

  return { overall, colors, typography, layout, components };
}

// ============================================================================
// TYPES
// ============================================================================

interface LayoutBuilderWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToAppConcept?: () => void;
  isFullPage?: boolean;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Confirmation dialog component
 */
function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'warning',
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'warning' | 'danger' | 'info';
}) {
  if (!isOpen) return null;

  const variantStyles = {
    warning: 'bg-yellow-600 hover:bg-yellow-500',
    danger: 'bg-red-600 hover:bg-red-500',
    info: 'bg-blue-600 hover:bg-blue-500',
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-xl shadow-2xl max-w-md w-full mx-4 border border-slate-700">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          <p className="text-slate-300 text-sm">{message}</p>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-700">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-lg font-medium transition-colors ${variantStyles[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Draft recovery banner
 */
function DraftRecoveryBanner({
  onRecover,
  onDiscard,
}: {
  onRecover: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="bg-blue-500/20 border-b border-blue-500/30 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <svg
          className="w-5 h-5 text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-sm text-blue-200">
          You have an unsaved draft from a previous session
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onDiscard}
          className="px-3 py-1.5 text-sm text-slate-300 hover:text-white transition-colors"
        >
          Discard
        </button>
        <button
          onClick={onRecover}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Recover Draft
        </button>
      </div>
    </div>
  );
}

/**
 * Design progress indicator component
 */
function DesignProgressIndicator({
  design,
  isExpanded = false,
  onToggle,
}: {
  design: Partial<LayoutDesign>;
  isExpanded?: boolean;
  onToggle?: () => void;
}) {
  const progress = useMemo(() => calculateDesignProgress(design), [design]);

  const getProgressColor = (value: number) => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 50) return 'bg-yellow-500';
    if (value >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getProgressLabel = (value: number) => {
    if (value >= 80) return 'Complete';
    if (value >= 50) return 'Good';
    if (value >= 25) return 'Basic';
    return 'Starting';
  };

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
      {/* Collapsed view - just overall progress */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <span className="text-xs font-medium text-slate-300">Design Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold ${progress.overall >= 50 ? 'text-green-400' : 'text-slate-400'}`}
          >
            {progress.overall}%
          </span>
          <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor(progress.overall)} transition-all duration-300`}
              style={{ width: `${progress.overall}%` }}
            />
          </div>
          <svg
            className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded view - category breakdown */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-700/50">
          <div className="grid grid-cols-2 gap-2">
            {/* Colors */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 uppercase">Colors</span>
                <span className="text-xs font-medium text-slate-400">{progress.colors}%</span>
              </div>
              <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getProgressColor(progress.colors)} transition-all duration-300`}
                  style={{ width: `${progress.colors}%` }}
                />
              </div>
            </div>

            {/* Typography */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 uppercase">Typography</span>
                <span className="text-xs font-medium text-slate-400">{progress.typography}%</span>
              </div>
              <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getProgressColor(progress.typography)} transition-all duration-300`}
                  style={{ width: `${progress.typography}%` }}
                />
              </div>
            </div>

            {/* Layout */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 uppercase">Layout</span>
                <span className="text-xs font-medium text-slate-400">{progress.layout}%</span>
              </div>
              <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getProgressColor(progress.layout)} transition-all duration-300`}
                  style={{ width: `${progress.layout}%` }}
                />
              </div>
            </div>

            {/* Components */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 uppercase">Components</span>
                <span className="text-xs font-medium text-slate-400">{progress.components}%</span>
              </div>
              <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getProgressColor(progress.components)} transition-all duration-300`}
                  style={{ width: `${progress.components}%` }}
                />
              </div>
            </div>
          </div>

          {/* Status label */}
          <div className="mt-2 text-center">
            <span
              className={`text-xs font-medium ${progress.overall >= 50 ? 'text-green-400' : 'text-slate-500'}`}
            >
              {getProgressLabel(progress.overall)} -{' '}
              {progress.overall >= 80 ? 'Ready to apply!' : 'Keep customizing'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Message bubble component with error retry support
 */
function MessageBubble({
  message,
  onRetry,
}: {
  message: LayoutMessage;
  onRetry?: (messageId: string) => void;
}) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const hasError = message.error && !isUser;
  const canRetry = hasError && message.error?.canRetry;

  if (isSystem) return null;

  // Get error icon based on error type
  const getErrorIcon = () => {
    switch (message.error?.type) {
      case 'network':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
        );
      case 'rate_limit':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'server':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        );
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : hasError
              ? 'bg-red-500/20 border border-red-500/30 text-slate-100'
              : 'bg-slate-700 text-slate-100'
        }`}
      >
        {/* Show error header if present */}
        {hasError && (
          <div className="flex items-center gap-2 text-red-400 text-xs font-medium mb-2">
            {getErrorIcon()}
            <span>Error</span>
          </div>
        )}

        {/* Show selected element indicator if present */}
        {message.selectedElement && (
          <div className="text-xs opacity-70 mb-2 flex items-center gap-1">
            <span>Selected:</span>
            <span className="font-medium">{message.selectedElement}</span>
          </div>
        )}

        {/* Show attached snapshot indicator */}
        {message.previewSnapshot && (
          <div className="text-xs opacity-70 mb-2 flex items-center gap-1">
            <span>Attached preview snapshot</span>
          </div>
        )}

        {/* Message content */}
        <div
          className={`text-sm whitespace-pre-wrap leading-relaxed ${hasError ? 'text-red-200' : ''}`}
        >
          {message.isRetrying ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
              Retrying...
            </span>
          ) : (
            message.content
          )}
        </div>

        {/* Retry button for errors */}
        {canRetry && !message.isRetrying && onRetry && (
          <button
            onClick={() => onRetry(message.id)}
            className="mt-3 px-3 py-1.5 bg-red-500/30 hover:bg-red-500/50 text-red-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Retry
          </button>
        )}

        {/* Timestamp */}
        <div
          className={`text-xs mt-2 ${isUser ? 'text-blue-200' : hasError ? 'text-red-300/70' : 'text-slate-400'}`}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

/**
 * Suggested actions bar
 */
function SuggestedActionsBar({
  actions,
  onAction,
}: {
  actions: SuggestedAction[];
  onAction: (action: string) => void;
}) {
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-slate-700">
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={() => onAction(action.action)}
          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors flex items-center gap-1.5"
        >
          {action.icon && <span>{action.icon}</span>}
          {action.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Recent changes indicator
 */
function RecentChangesIndicator({ changes }: { changes: DesignChange[] }) {
  if (changes.length === 0) return null;

  return (
    <div className="px-4 py-2 bg-green-500/10 border-t border-green-500/20">
      <div className="text-xs text-green-400 font-medium mb-1">Recent Changes:</div>
      <div className="space-y-1">
        {changes.slice(0, 3).map((change, i) => (
          <div key={i} className="text-xs text-green-300/80">
            {change.property}: {String(change.oldValue)} → {String(change.newValue)}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Reference images panel
 * Note: Uses parent's file input via onAdd callback for consistent compression handling
 */
function ReferenceImagesPanel({
  images,
  onRemove,
  onAdd,
}: {
  images: string[];
  onRemove: (index: number) => void;
  onAdd: () => void;
}) {
  if (images.length === 0) {
    return (
      <button
        type="button"
        onClick={onAdd}
        className="w-full px-4 py-3 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors text-sm"
      >
        + Add design inspiration
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-400 font-medium">Reference Images</div>
      <div className="flex flex-wrap gap-2">
        {images.map((img, i) => (
          <div key={i} className="relative group">
            <img
              src={img}
              alt={`Reference ${i + 1}`}
              className="w-16 h-16 object-cover rounded-lg border border-slate-600"
            />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              x
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="w-16 h-16 border-2 border-dashed border-slate-600 rounded-lg text-slate-500 hover:border-slate-500 hover:text-slate-400 transition-colors text-2xl flex items-center justify-center"
        >
          +
        </button>
      </div>
    </div>
  );
}

/**
 * Template picker component for quick start
 */
function TemplatePicker({
  isOpen,
  onSelect,
  onClose,
}: {
  isOpen: boolean;
  onSelect: (template: DesignTemplate) => void;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  const getCategoryIcon = (category: DesignTemplate['category']) => {
    switch (category) {
      case 'business':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        );
      case 'creative':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
            />
          </svg>
        );
      case 'commerce':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        );
      case 'utility':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        );
    }
  };

  return (
    <div className="absolute inset-0 bg-slate-900/95 z-20 flex flex-col">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Choose a Template</h3>
          <p className="text-sm text-slate-400">Start with a pre-designed layout</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white transition-colors"
          aria-label="Close template picker"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4">
          {DESIGN_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className="text-left p-4 bg-slate-800 border border-slate-700 rounded-xl hover:border-blue-500 hover:bg-slate-750 transition-all group"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-slate-400 group-hover:text-blue-400 transition-colors">
                  {getCategoryIcon(template.category)}
                </span>
                <span className="text-sm font-medium text-white">{template.name}</span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2">{template.description}</p>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    template.design.basePreferences?.colorScheme === 'dark'
                      ? 'bg-slate-700 text-slate-300'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {template.design.basePreferences?.colorScheme}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                  {template.design.basePreferences?.layout}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={onClose}
          className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          Skip and start from scratch
        </button>
      </div>
    </div>
  );
}

/**
 * Chat input component
 */
function ChatInput({
  onSend,
  onCapture,
  isLoading,
  isCapturing,
  hasSelection,
}: {
  onSend: (text: string, includeCapture: boolean) => void;
  onCapture: () => void;
  isLoading: boolean;
  isCapturing: boolean;
  hasSelection: boolean;
}) {
  const [input, setInput] = useState('');
  const [includeCapture, setIncludeCapture] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() || includeCapture) {
      onSend(input, includeCapture);
      setInput('');
      setIncludeCapture(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-slate-700 p-4">
      {/* Capture toggle */}
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => setIncludeCapture(!includeCapture)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            includeCapture
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {includeCapture ? 'Attached' : 'Attach Preview'}
        </button>

        <button
          type="button"
          onClick={onCapture}
          disabled={isCapturing}
          className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-sm font-medium transition-colors flex items-center gap-1.5"
        >
          {isCapturing ? (
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
              Capturing...
            </>
          ) : (
            'Capture Now'
          )}
        </button>

        {hasSelection && (
          <span className="text-xs text-blue-400 ml-auto">
            Element selected - AI will see it highlighted
          </span>
        )}
      </div>

      {/* Input area */}
      <div className="flex gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you'd like to change..."
          className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 resize-none focus:outline-none focus:border-blue-500 transition-colors"
          rows={2}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || (!input.trim() && !includeCapture)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
        >
          {isLoading ? '...' : 'Send'}
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LayoutBuilderWizard({
  isOpen,
  onClose,
  onApplyToAppConcept,
  isFullPage = false,
}: LayoutBuilderWizardProps) {
  const {
    messages,
    design,
    isLoading,
    selectedElement,
    referenceImages,
    suggestedActions,
    recentChanges,
    hasDraftToRecover,
    canUndo,
    canRedo,
    versionHistory,
    currentVersionId,
    sendMessage,
    setSelectedElement,
    addReferenceImage,
    removeReferenceImage,
    capturePreview,
    updateDesign,
    saveDesign,
    applyToAppConcept,
    recoverDraft,
    discardDraft,
    undo,
    redo,
    retryMessage,
    exportDesign,
    importDesign,
    restoreVersion,
    deleteVersion,
    hasUnsavedChanges,
  } = useLayoutBuilder();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Toast notifications
  const { toasts, success, error, info, dismiss } = useToast();

  // Confirmation dialog state
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);

  // Loading states for async operations
  const [isSaving, setIsSaving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Template picker state - show on first open when only greeting message
  const [showTemplatePicker, setShowTemplatePicker] = useState(messages.length <= 1);

  // Version history panel state
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Export menu state
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Progress indicator state
  const [progressExpanded, setProgressExpanded] = useState(false);

  // Message windowing state for virtualization
  const [visibleMessageCount, setVisibleMessageCount] = useState(MESSAGES_PAGE_SIZE);

  // Calculate visible messages with windowing
  const { visibleMessages, hasMoreMessages, totalMessages } = useMemo(() => {
    const total = messages.length;
    const startIndex = Math.max(0, total - Math.min(visibleMessageCount, MAX_RENDERED_MESSAGES));
    const visible = messages.slice(startIndex);
    return {
      visibleMessages: visible,
      hasMoreMessages: startIndex > 0,
      totalMessages: total,
    };
  }, [messages, visibleMessageCount]);

  // Load more messages handler
  const loadMoreMessages = useCallback(() => {
    setVisibleMessageCount((prev) => Math.min(prev + MESSAGES_PAGE_SIZE, MAX_RENDERED_MESSAGES));
  }, []);

  // Reset visible count when messages significantly change (e.g., clear)
  useEffect(() => {
    if (messages.length <= MESSAGES_PAGE_SIZE) {
      setVisibleMessageCount(MESSAGES_PAGE_SIZE);
    }
  }, [messages.length]);

  // Handle close with confirmation
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 300));
      saveDesign();
      success('Design saved!');
    } catch (err) {
      error('Failed to save design');
    } finally {
      setIsSaving(false);
    }
  }, [saveDesign, success, error]);

  // Handle save and close
  const handleSaveAndClose = useCallback(async () => {
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      saveDesign();
      success('Design saved successfully!');
      setShowCloseConfirm(false);
      onClose();
    } catch (err) {
      error('Failed to save design');
    } finally {
      setIsSaving(false);
    }
  }, [saveDesign, onClose, success, error]);

  // Handle discard and close
  const handleDiscardAndClose = useCallback(() => {
    setShowCloseConfirm(false);
    onClose();
  }, [onClose]);

  // Handle apply with confirmation
  const handleApplyClick = useCallback(() => {
    setShowApplyConfirm(true);
  }, []);

  // Confirm apply to app concept
  const handleConfirmApply = useCallback(async () => {
    setIsApplying(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      applyToAppConcept();
      setShowApplyConfirm(false);
      success('Design applied to app concept!');
      onApplyToAppConcept?.();
    } catch (err) {
      error('Failed to apply design');
    } finally {
      setIsApplying(false);
    }
  }, [applyToAppConcept, onApplyToAppConcept, success, error]);

  // Handle capture preview
  const handleCapture = useCallback(async () => {
    setIsCapturing(true);
    try {
      const result = await capturePreview();
      if (result) {
        success('Preview captured!');
      } else {
        error('Failed to capture preview');
      }
    } catch (err) {
      error('Failed to capture preview');
    } finally {
      setIsCapturing(false);
    }
  }, [capturePreview, success, error]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, undo, redo]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build UIPreferences from design for LayoutPreview
  const previewPreferences: UIPreferences = {
    style: design.basePreferences?.style || 'modern',
    colorScheme: design.basePreferences?.colorScheme || 'dark',
    layout: design.basePreferences?.layout || 'single-page',
    primaryColor: design.globalStyles?.colors?.primary || '#3B82F6',
  };

  // Handle suggested action clicks
  const handleAction = useCallback(
    (action: string) => {
      switch (action) {
        case 'capture_preview':
          capturePreview();
          break;
        case 'upload_reference':
          fileInputRef.current?.click();
          break;
        case 'toggle_theme':
          updateDesign({
            basePreferences: {
              ...design.basePreferences,
              colorScheme: design.basePreferences?.colorScheme === 'dark' ? 'light' : 'dark',
            } as typeof design.basePreferences,
          });
          break;
        case 'save_design':
          saveDesign();
          break;
        case 'apply_to_concept':
          applyToAppConcept();
          onApplyToAppConcept?.();
          break;
      }
    },
    [
      capturePreview,
      updateDesign,
      design.basePreferences,
      saveDesign,
      applyToAppConcept,
      onApplyToAppConcept,
    ]
  );

  // Handle effects settings change from DesignControlPanel
  const handleEffectsChange = useCallback(
    (effects: Partial<EffectsSettings>) => {
      updateDesign({
        globalStyles: {
          ...design.globalStyles,
          effects: {
            ...design.globalStyles?.effects,
            ...effects,
          } as EffectsSettings,
        },
      });
    },
    [updateDesign, design.globalStyles]
  );

  // Handle color settings change from DesignControlPanel
  const handleColorSettingsChange = useCallback(
    (colors: Partial<ColorSettings>) => {
      updateDesign({
        globalStyles: {
          ...design.globalStyles,
          colors: {
            ...design.globalStyles?.colors,
            ...colors,
          } as ColorSettings,
        },
      });
    },
    [updateDesign, design.globalStyles]
  );

  // Handle primary color change from DesignControlPanel
  const handlePrimaryColorChange = useCallback(
    (color: string) => {
      updateDesign({
        globalStyles: {
          ...design.globalStyles,
          colors: {
            ...design.globalStyles?.colors,
            primary: color,
          } as ColorSettings,
        },
      });
    },
    [updateDesign, design.globalStyles]
  );

  // Handle reference image upload with compression
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        error('Please select an image file');
        e.target.value = '';
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        error('Image must be less than 10MB');
        e.target.value = '';
        return;
      }

      try {
        // Compress the image
        const { dataUrl, originalSize, compressedSize } = await compressImage(file);

        addReferenceImage(dataUrl);

        // Show compression info if significant size reduction
        const reduction = ((originalSize - compressedSize) / originalSize) * 100;
        if (reduction > 10) {
          success(
            `Image added (${formatBytes(originalSize)} → ${formatBytes(compressedSize)}, ${Math.round(reduction)}% smaller)`
          );
        } else {
          success('Reference image added');
        }
      } catch (err) {
        error('Failed to process image. Please try another file.');
      }

      // Reset input
      e.target.value = '';
    },
    [addReferenceImage, error, success]
  );

  // Handle template selection
  const handleTemplateSelect = useCallback(
    (template: DesignTemplate) => {
      updateDesign(template.design as Partial<LayoutDesign>);
      setShowTemplatePicker(false);
      success(`Applied "${template.name}" template`);
    },
    [updateDesign, success]
  );

  // Handle export - JSON (original)
  const handleExportJSON = useCallback(() => {
    exportDesign(false);
    success('Design exported as JSON');
    setShowExportMenu(false);
  }, [exportDesign, success]);

  // Handle export - CSS Variables
  const handleExportCSS = useCallback(() => {
    const css = exportToCSSVariables(design as LayoutDesign);
    downloadExport(css, `${design.name || 'design'}-variables.css`, 'text/css');
    success('CSS variables exported');
    setShowExportMenu(false);
  }, [design, success]);

  // Handle export - Tailwind Config
  const handleExportTailwind = useCallback(() => {
    const config = exportToTailwindConfig(design as LayoutDesign);
    downloadExport(config, 'tailwind.config.js', 'application/javascript');
    success('Tailwind config exported');
    setShowExportMenu(false);
  }, [design, success]);

  // Handle export - React Component
  const handleExportReact = useCallback(() => {
    const component = exportToReactComponent(design as LayoutDesign);
    const filename = `${(design.name || 'Layout').replace(/[^a-zA-Z0-9]/g, '')}.tsx`;
    downloadExport(component, filename, 'text/typescript');
    success('React component exported');
    setShowExportMenu(false);
  }, [design, success]);

  // Handle export - Design Tokens
  const handleExportTokens = useCallback(() => {
    const tokens = exportToFigmaTokens(design as LayoutDesign);
    downloadExport(JSON.stringify(tokens, null, 2), 'design-tokens.json', 'application/json');
    success('Design tokens exported');
    setShowExportMenu(false);
  }, [design, success]);

  // Handle copy CSS to clipboard
  const handleCopyCSS = useCallback(async () => {
    const css = exportToCSSVariables(design as LayoutDesign);
    const copied = await copyToClipboard(css);
    if (copied) {
      success('CSS variables copied to clipboard');
    } else {
      error('Failed to copy to clipboard');
    }
    setShowExportMenu(false);
  }, [design, success, error]);

  // Handle import file selection
  const handleImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.name.endsWith('.json')) {
        error('Please select a JSON file');
        e.target.value = '';
        return;
      }

      const result = await importDesign(file);
      if (result) {
        success('Design imported successfully');
      } else {
        error('Failed to import design. Please check the file format.');
      }

      e.target.value = '';
    },
    [importDesign, success, error]
  );

  // Handle version restore
  const handleRestoreVersion = useCallback(
    (versionId: string) => {
      restoreVersion(versionId);
      success('Version restored successfully');
      setShowVersionHistory(false);
    },
    [restoreVersion, success]
  );

  // Handle version delete
  const handleDeleteVersion = useCallback(
    (versionId: string) => {
      deleteVersion(versionId);
      info('Version deleted');
    },
    [deleteVersion, info]
  );

  // Handle preference changes from preview
  const handlePreferenceChange = useCallback(
    (prefs: Partial<UIPreferences>) => {
      updateDesign({
        basePreferences: {
          ...design.basePreferences,
          style: prefs.style || design.basePreferences?.style,
          colorScheme: prefs.colorScheme || design.basePreferences?.colorScheme,
          layout: prefs.layout || design.basePreferences?.layout,
        } as typeof design.basePreferences,
        globalStyles: {
          ...design.globalStyles,
          colors: {
            ...design.globalStyles?.colors,
            primary: prefs.primaryColor || design.globalStyles?.colors?.primary,
          },
        } as typeof design.globalStyles,
      });
    },
    [design, updateDesign]
  );

  if (!isOpen) return null;

  const content = (
    <div
      className={`${isFullPage ? 'w-full h-full' : 'w-[95vw] h-[90vh] max-w-[1600px]'} bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-700`}
    >
      {/* Draft recovery banner */}
      {hasDraftToRecover && (
        <DraftRecoveryBanner onRecover={recoverDraft} onDiscard={discardDraft} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">Layout Builder</h2>
          {hasUnsavedChanges && (
            <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">
              Unsaved changes
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Templates button */}
          <button
            onClick={() => setShowTemplatePicker(true)}
            className="px-3 py-1.5 text-sm text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
            title="Choose a design template"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
              />
            </svg>
            Templates
          </button>

          {/* Export/Import/History buttons */}
          <div className="flex items-center gap-1">
            {/* Export dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className={`p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors ${showExportMenu ? 'bg-slate-700 text-white' : ''}`}
                title="Export design"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
              </button>
              {showExportMenu && (
                <>
                  {/* Backdrop to close menu */}
                  <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                  {/* Dropdown menu */}
                  <div className="absolute right-0 top-full mt-1 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1 overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-700">
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Export Format
                      </span>
                    </div>
                    <button
                      onClick={handleExportJSON}
                      className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                    >
                      <svg
                        className="w-4 h-4 text-blue-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      JSON (Full Design)
                    </button>
                    <button
                      onClick={handleExportCSS}
                      className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                    >
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
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                      CSS Variables
                    </button>
                    <button
                      onClick={handleExportTailwind}
                      className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                    >
                      <svg
                        className="w-4 h-4 text-cyan-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                        />
                      </svg>
                      Tailwind Config
                    </button>
                    <button
                      onClick={handleExportReact}
                      className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                    >
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
                          d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      React Component
                    </button>
                    <button
                      onClick={handleExportTokens}
                      className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                    >
                      <svg
                        className="w-4 h-4 text-yellow-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                      Design Tokens (Figma)
                    </button>
                    <div className="border-t border-slate-700 mt-1 pt-1">
                      <button
                        onClick={handleCopyCSS}
                        className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                      >
                        <svg
                          className="w-4 h-4 text-slate-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                          />
                        </svg>
                        Copy CSS to Clipboard
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => importInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              title="Import design from JSON file"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </button>
            <button
              onClick={() => setShowVersionHistory(true)}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors relative"
              title="View version history"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {versionHistory.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] bg-blue-600 text-white rounded-full flex items-center justify-center">
                  {versionHistory.length > 9 ? '9+' : versionHistory.length}
                </span>
              )}
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>

          {/* Undo/Redo buttons */}
          <div className="flex items-center gap-1 mr-2">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-2 text-slate-400 hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-2 text-slate-400 hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
              title="Redo (Ctrl+Shift+Z)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"
                />
              </svg>
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                Saving...
              </>
            ) : (
              'Save Design'
            )}
          </button>
          <button
            onClick={handleApplyClick}
            disabled={isApplying}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isApplying ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                Applying...
              </>
            ) : (
              'Apply to App Concept'
            )}
          </button>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat panel (left) */}
        <div className="w-1/2 flex flex-col border-r border-slate-700 relative">
          {/* Template Picker Overlay */}
          <TemplatePicker
            isOpen={showTemplatePicker}
            onSelect={handleTemplateSelect}
            onClose={() => setShowTemplatePicker(false)}
          />

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            {/* Load more button for older messages */}
            {hasMoreMessages && (
              <div className="flex justify-center mb-2">
                <button
                  type="button"
                  onClick={loadMoreMessages}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                  Load {Math.min(MESSAGES_PAGE_SIZE, totalMessages - visibleMessages.length)} older
                  messages
                  <span className="text-slate-500">
                    ({visibleMessages.length} of {totalMessages})
                  </span>
                </button>
              </div>
            )}
            {visibleMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} onRetry={retryMessage} />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-slate-700 rounded-2xl px-4 py-3 text-slate-300">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <div
                      className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Recent changes */}
          <RecentChangesIndicator changes={recentChanges} />

          {/* Design progress indicator */}
          <div className="px-4 py-2 border-t border-slate-700">
            <DesignProgressIndicator
              design={design}
              isExpanded={progressExpanded}
              onToggle={() => setProgressExpanded(!progressExpanded)}
            />
          </div>

          {/* Suggested actions */}
          <SuggestedActionsBar actions={suggestedActions} onAction={handleAction} />

          {/* Reference images */}
          <div className="px-4 py-3 border-t border-slate-700">
            <ReferenceImagesPanel
              images={referenceImages}
              onRemove={removeReferenceImage}
              onAdd={() => fileInputRef.current?.click()}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Input */}
          <ChatInput
            onSend={sendMessage}
            onCapture={handleCapture}
            isLoading={isLoading}
            isCapturing={isCapturing}
            hasSelection={!!selectedElement}
          />
        </div>

        {/* Preview panel (right) */}
        <div className="w-1/2 flex flex-col bg-slate-950">
          {/* Selected element indicator */}
          {selectedElement && (
            <div className="px-4 py-2 bg-blue-500/20 border-b border-blue-500/30 flex items-center justify-between">
              <span className="text-sm text-blue-300">
                Selected: <strong>{selectedElement}</strong>
              </span>
              <button
                onClick={() => setSelectedElement(null)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Clear selection
              </button>
            </div>
          )}

          {/* Design Control Panel */}
          <div className="px-4 pt-4">
            <DesignControlPanel
              effectsSettings={design.globalStyles?.effects}
              colorSettings={design.globalStyles?.colors}
              onEffectsChange={handleEffectsChange}
              onColorChange={handleColorSettingsChange}
              primaryColor={design.globalStyles?.colors?.primary}
              onPrimaryColorChange={handlePrimaryColorChange}
            />
          </div>

          {/* Layout Preview */}
          <div className="flex-1 p-4" id="layout-preview-container">
            <div id="layout-preview-frame" className="h-full">
              <LayoutPreview
                preferences={previewPreferences}
                className="h-full"
                onPreferenceChange={handlePreferenceChange}
                onElementSelect={setSelectedElement}
                selectedElement={selectedElement}
                componentDesign={{
                  effectsSettings: design.globalStyles?.effects,
                  colorSettings: design.globalStyles?.colors,
                  headerDesign: design.components?.header,
                  sidebarDesign: design.components?.sidebar,
                  cardDesign: design.components?.cards,
                  navDesign: design.components?.navigation,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const dialogs = (
    <>
      {/* Close confirmation dialog */}
      <ConfirmDialog
        isOpen={showCloseConfirm}
        title="Unsaved Changes"
        message="You have unsaved changes. Would you like to save before closing?"
        confirmLabel="Save & Close"
        cancelLabel="Discard"
        onConfirm={handleSaveAndClose}
        onCancel={handleDiscardAndClose}
        variant="warning"
      />

      {/* Apply confirmation dialog */}
      <ConfirmDialog
        isOpen={showApplyConfirm}
        title="Apply to App Concept"
        message="This will update your app concept with the current layout design. Any existing layout preferences will be overwritten."
        confirmLabel="Apply"
        cancelLabel="Cancel"
        onConfirm={handleConfirmApply}
        onCancel={() => setShowApplyConfirm(false)}
        variant="info"
      />

      {/* Version History Panel */}
      {showVersionHistory && (
        <VersionHistoryPanel
          versions={versionHistory}
          currentVersionId={currentVersionId}
          currentDesign={design}
          onRestore={handleRestoreVersion}
          onDelete={handleDeleteVersion}
          onClose={() => setShowVersionHistory(false)}
        />
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} position="top-right" />
    </>
  );

  if (isFullPage) {
    return (
      <>
        {content}
        {dialogs}
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      {content}
      {dialogs}
    </div>
  );
}

export default LayoutBuilderWizard;
