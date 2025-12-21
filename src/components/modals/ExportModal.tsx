'use client';

import React, { useState, useCallback } from 'react';
import { getExportService, type ExportFormat } from '@/services/ExportService';
import type { AppFile } from '@/types/railway';

// ============================================================================
// TYPES
// ============================================================================

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  appName: string;
  files: AppFile[];
  dependencies?: Record<string, string>;
}

interface ExportOption {
  id: ExportFormat;
  name: string;
  description: string;
  icon: React.ReactNode;
  recommended?: boolean;
}

// ============================================================================
// EXPORT OPTIONS
// ============================================================================

const exportOptions: ExportOption[] = [
  {
    id: 'zip',
    name: 'Download ZIP',
    description: 'Download project files as a ZIP archive',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
    ),
    recommended: true,
  },
  {
    id: 'vercel',
    name: 'Deploy to Vercel',
    description: 'One-click deploy to Vercel (requires GitHub)',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 22.525H0l12-21.05 12 21.05z" />
      </svg>
    ),
  },
  {
    id: 'netlify',
    name: 'Deploy to Netlify',
    description: 'Drag and drop deploy to Netlify',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.934 8.519a1.044 1.044 0 0 1 .303.23l2.349-1.045-2.192-2.171-.491 2.954zM12.06 6.546a1.305 1.305 0 0 1 .209.574l3.497 1.482a1.044 1.044 0 0 1 .366-.325l.502-3.015-3.137-3.11-.091.043-1.346 4.35zM11.2 8.592l-5.14 5.132 3.89 1.632 1.794-1.793a.93.93 0 0 1-.07-.344.95.95 0 0 1 .943-.943.95.95 0 0 1 .943.943.929.929 0 0 1-.07.344l1.793 1.793 3.89-1.632-5.14-5.132a1.305 1.305 0 0 1-1.31-.001h-.001l-1.533.001z" />
      </svg>
    ),
  },
  {
    id: 'clipboard',
    name: 'Copy to Clipboard',
    description: 'Copy main component code to clipboard',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
        />
      </svg>
    ),
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function ExportModal({
  isOpen,
  onClose,
  appName,
  files,
  dependencies = {},
}: ExportModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      setIsExporting(true);
      setExportingFormat(format);
      setResult(null);

      try {
        const service = getExportService();
        const exportResult = await service.export(format, {
          appName,
          files,
          dependencies,
        });

        setResult({ success: exportResult.success, message: exportResult.message });

        // Auto-close on successful ZIP download
        if (exportResult.success && format === 'zip') {
          setTimeout(() => {
            onClose();
            setResult(null);
          }, 2000);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Export failed';
        setResult({ success: false, message });
      } finally {
        setIsExporting(false);
        setExportingFormat(null);
      }
    },
    [appName, files, dependencies, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 border border-zinc-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Export App</h2>
            <p className="text-sm text-zinc-400 mt-0.5">{appName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
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

        {/* Content */}
        <div className="p-4">
          {/* Result message */}
          {result && (
            <div
              className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
                result.success
                  ? 'bg-green-900/30 border border-green-700/50 text-green-300'
                  : 'bg-red-900/30 border border-red-700/50 text-red-300'
              }`}
            >
              {result.success ? (
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 flex-shrink-0"
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
              )}
              <span>{result.message}</span>
            </div>
          )}

          {/* Export options */}
          <div className="space-y-2">
            {exportOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleExport(option.id)}
                disabled={isExporting}
                className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-colors text-left ${
                  option.recommended
                    ? 'border-purple-600/50 bg-purple-900/20 hover:bg-purple-900/30'
                    : 'border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800'
                } ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    option.recommended
                      ? 'bg-purple-600/20 text-purple-400'
                      : 'bg-zinc-700 text-zinc-300'
                  }`}
                >
                  {exportingFormat === option.id ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
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
                  ) : (
                    option.icon
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-100">{option.name}</span>
                    {option.recommended && (
                      <span className="px-1.5 py-0.5 text-xs bg-purple-600/30 text-purple-300 rounded">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 mt-0.5">{option.description}</p>
                </div>
                <svg
                  className="w-5 h-5 text-zinc-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-700 bg-zinc-800/50 rounded-b-xl">
          <p className="text-xs text-zinc-500 text-center">
            {files.length} files &bull; {Object.keys(dependencies).length} dependencies
          </p>
        </div>
      </div>
    </div>
  );
}

export default ExportModal;
